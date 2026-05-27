import { motion } from 'framer-motion'

const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
  exit: { opacity: 0, y: -16, transition: { duration: 0.2 } }
}

export default function PageWrapper({ children, className = '', style: extStyle }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{ minHeight: '100vh', position: 'relative', zIndex: 1, ...extStyle }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
