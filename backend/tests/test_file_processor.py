import pytest
from app.services.file_processor import chunk_text

def test_chunk_text_basic():
    text = "A" * 2000
    chunks = chunk_text(text, chunk_size=1000, overlap=200)
    assert len(chunks) == 3
    assert len(chunks[0]) == 1000
    assert len(chunks[1]) == 1000
    assert len(chunks[2]) == 400

def test_chunk_text_small():
    text = "Hello world"
    chunks = chunk_text(text, chunk_size=1000, overlap=200)
    assert len(chunks) == 1
    assert chunks[0] == "Hello world"
