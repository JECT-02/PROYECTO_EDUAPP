from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.database import get_db
from app.models import User, Node, StudentActivity, QuizQuestion, QuizAnswer, StudentWeakness, Course
from app.schemas import QuizQuestionResponse, QuizSubmitRequest, QuizSubmitResponse
from app.dependencies import require_role
from app.services.ai_engine import generate_quiz_questions
from app.services.rag_service import retrieve_context
from app.services.gamification_service import recalculate_sync_score, award_xp
from app.utils.exceptions import NotFoundException, ForbiddenException
from typing import List
from datetime import datetime

router = APIRouter(prefix="/api/courses", tags=["quizzes"])

@router.get("/{course_id}/nodes/{node_id}/quiz", response_model=List[QuizQuestionResponse])
async def get_quiz(
    course_id: str,
    node_id: str,
    current_user: User = Depends(require_role(["student"])),
    db: AsyncSession = Depends(get_db)
):
    # Verify node & activity
    act_res = await db.execute(select(StudentActivity).filter(
        StudentActivity.student_id == current_user.id, StudentActivity.node_id == node_id))
    activity = act_res.scalars().first()
    if not activity or activity.status == "locked":
        raise ForbiddenException(code="LOCKED", detail="Node locked")
        
    node_res = await db.execute(select(Node).filter(Node.id == node_id))
    node = node_res.scalars().first()
    if not node or node.node_type != "quiz":
        raise NotFoundException(code="NOT_FOUND", detail="Quiz not found")
        
    if activity.status == "available":
        activity.status = "in_progress"
        await db.commit()

    # Check if we have questions
    q_res = await db.execute(select(QuizQuestion).filter(QuizQuestion.node_id == node_id))
    questions = q_res.scalars().all()
    
    # If no questions, generate them
    if not questions:
        # Get weaknesses
        weak_res = await db.execute(select(StudentWeakness).filter(
            StudentWeakness.student_id == current_user.id, StudentWeakness.course_id == course_id
        ).order_by(StudentWeakness.error_count.desc()).limit(3))
        weaknesses = [w.concept_name for w in weak_res.scalars().all()]
        
        context = await retrieve_context(course_id, node.title, db)
        gen_qs = await generate_quiz_questions(node.title, context, weaknesses)
        
        questions = []
        for q_data in gen_qs:
            q = QuizQuestion(
                node_id=node_id,
                question_text=q_data.get("text", "Pregunta?"),
                question_type=q_data.get("type", "multiple_choice"),
                options=q_data.get("options", {}),
                correct_answer=q_data.get("correct_answer", "a"),
                explanation=q_data.get("explanation", ""),
                concept_tag=q_data.get("concept_tag", "")
            )
            db.add(q)
            questions.append(q)
        await db.commit()
        
    responses = []
    for q in questions[:3]: # Take max 3 for micro-quiz
        responses.append(QuizQuestionResponse(
            id=q.id,
            text=q.question_text,
            type=q.question_type,
            options=q.options
        ))
        
    return responses

@router.post("/{course_id}/nodes/{node_id}/quiz/submit", response_model=QuizSubmitResponse)
async def submit_quiz(
    course_id: str,
    node_id: str,
    request: QuizSubmitRequest,
    current_user: User = Depends(require_role(["student"])),
    db: AsyncSession = Depends(get_db)
):
    # Verify node & activity
    act_res = await db.execute(select(StudentActivity).filter(
        StudentActivity.student_id == current_user.id, StudentActivity.node_id == node_id))
    activity = act_res.scalars().first()
    
    correct_count = 0
    total = len(request.answers)
    if total == 0:
        total = 1
        
    correct_map = {}
    explanation_map = {}
    
    for q_id, given_ans in request.answers.items():
        q_res = await db.execute(select(QuizQuestion).filter(QuizQuestion.id == q_id))
        q = q_res.scalars().first()
        if not q: continue
        
        is_correct = (given_ans.strip().lower() == q.correct_answer.strip().lower())
        if is_correct:
            correct_count += 1
            
        correct_map[q_id] = q.correct_answer
        explanation_map[q_id] = q.explanation
        
        # Save answer
        ans = QuizAnswer(
            student_id=current_user.id,
            question_id=q_id,
            given_answer=given_ans,
            is_correct=is_correct,
            time_taken_seconds=request.time_taken // total
        )
        db.add(ans)
        
        # Update weaknesses if wrong
        if not is_correct and q.concept_tag:
            w_res = await db.execute(select(StudentWeakness).filter(
                StudentWeakness.student_id == current_user.id,
                StudentWeakness.course_id == course_id,
                StudentWeakness.concept_name == q.concept_tag
            ))
            w = w_res.scalars().first()
            if w:
                w.error_count += 1
                w.last_error_at = datetime.now()
            else:
                w = StudentWeakness(
                    student_id=current_user.id, course_id=course_id, 
                    concept_name=q.concept_tag, error_count=1, last_error_at=datetime.now()
                )
                db.add(w)
                
    score = correct_count / total
    passed = score >= 0.66 # 2/3 for micro-quiz
    
    if activity:
        activity.attempts_count += 1
        activity.score = score
        if passed:
            activity.status = "completed"
            activity.completed_at = datetime.now()
            
            # Unlock next nodes logic
            all_nodes_res = await db.execute(select(Node).filter(Node.course_id == course_id).order_by(Node.order_index))
            nodes = all_nodes_res.scalars().all()
            for n in nodes:
                if node_id in n.prerequisites:
                    n_act_res = await db.execute(select(StudentActivity).filter(
                        StudentActivity.student_id == current_user.id, StudentActivity.node_id == n.id))
                    n_act = n_act_res.scalars().first()
                    if n_act and n_act.status == "locked":
                        # Check all prerequisites
                        all_met = True
                        for prereq in n.prerequisites:
                            p_act_res = await db.execute(select(StudentActivity).filter(
                                StudentActivity.student_id == current_user.id, StudentActivity.node_id == prereq))
                            p_act = p_act_res.scalars().first()
                            if not p_act or p_act.status != "completed":
                                all_met = False
                                break
                        if all_met:
                            n_act.status = "available"
                            
    await db.commit()
    
    xp_earned = 0
    if passed:
        await award_xp(current_user.id, 10, db)
        xp_earned = 10
        
    new_sync = await recalculate_sync_score(current_user.id, db)
    
    return QuizSubmitResponse(
        score=score,
        passed=passed,
        correct_answers=correct_map,
        explanations=explanation_map,
        xp_earned=xp_earned,
        new_sync_score=new_sync
    )
