"""
Test script for the AgenticEngine few-shot examples functionality.

This script demonstrates how the engine loads and uses few-shot examples
from the examples directory based on the selected template.
"""

import sys
from pathlib import Path

# Add the src directory to the path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from src.infra.agent_core.engine import AgenticEngine
from src.infra.agent_core.rag import RAGStrategy


class MockRAGStrategy(RAGStrategy):
    """Mock RAG strategy for testing."""
    
    def __call__(self, query: str, user_id: str = None, top_k: int = 5):
        """Return empty results for testing."""
        return []


def test_few_shot_loading():
    """Test that few-shot examples are loaded correctly."""
    print("=" * 80)
    print("Testing Few-Shot Examples Loading")
    print("=" * 80)
    
    # Initialize engine with mock RAG
    engine = AgenticEngine(rag_strategy=MockRAGStrategy())
    
    # Test different template types
    test_cases = [
        ("action_generation", "Can you make me a Margarita?"),
        ("retrieval_augmented", "What drinks use tequila?"),
        ("chat_style", "I'm in the mood for something tropical"),
        ("classic_completion", "Tell me about cocktails"),
        ("question_answering", "How do you make a Manhattan?"),
    ]
    
    for template_name, user_input in test_cases:
        print(f"\n{'=' * 80}")
        print(f"Template: {template_name}")
        print(f"User Input: {user_input}")
        print(f"{'=' * 80}")
        
        # Get template selection
        selected = engine._default_selector(user_input)
        print(f"Selected Template: {selected}")
        
        # Load examples for this template
        examples = engine._get_few_shot_examples(selected)
        
        print(f"\nLoaded {len(examples)} example(s):")
        for idx, example in enumerate(examples, 1):
            # Show first 200 chars of each example
            preview = example[:200].replace("\n", " ")
            print(f"  {idx}. {preview}...")
    
    print("\n" + "=" * 80)
    print("Testing Complete!")
    print("=" * 80)


def test_example_file_contents():
    """Display the actual content of example files."""
    print("\n" + "=" * 80)
    print("Example File Contents")
    print("=" * 80)
    
    engine = AgenticEngine(rag_strategy=MockRAGStrategy())
    examples_dir = engine.examples_dir
    
    # List all example files
    example_files = sorted(examples_dir.glob("*.txt"))
    
    for example_file in example_files:
        print(f"\n{'=' * 80}")
        print(f"File: {example_file.name}")
        print(f"{'=' * 80}")
        
        with open(example_file, 'r', encoding='utf-8') as f:
            content = f.read()
            # Show first 500 characters
            if len(content) > 500:
                print(content[:500] + "\n... [truncated]")
            else:
                print(content)


def test_template_mapping():
    """Show which templates map to which examples."""
    print("\n" + "=" * 80)
    print("Template to Examples Mapping")
    print("=" * 80)
    
    engine = AgenticEngine(rag_strategy=MockRAGStrategy())
    
    templates = [
        "action_generation",
        "retrieval_augmented",
        "chat_style",
        "classic_completion",
        "question_answering",
        "summarization"
    ]
    
    for template in templates:
        examples = engine._get_few_shot_examples(template)
        print(f"\n{template}:")
        print(f"  → {len(examples)} example(s)")
        
        if examples:
            # Extract file names from the mapping
            for idx, example in enumerate(examples, 1):
                # Get first line of conversation
                lines = example.split('\n')
                if len(lines) > 1:
                    conv_line = lines[1][:60] if len(lines[1]) > 60 else lines[1]
                    print(f"    {idx}. {conv_line}...")


if __name__ == "__main__":
    print("\n🍸 AgenticEngine Few-Shot Examples Test Suite 🍸\n")
    
    try:
        # Run tests
        test_few_shot_loading()
        test_template_mapping()
        test_example_file_contents()
        
        print("\n✅ All tests completed successfully!\n")
        
    except Exception as e:
        print(f"\n❌ Error during testing: {e}\n")
        import traceback
        traceback.print_exc()

