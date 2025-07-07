#!/usr/bin/env python3

"""
Test script for the Smart Summarizer LangGraph implementation.
This script tests the new summarization pipeline and measures compression improvements.
"""

from dotenv import load_dotenv
import asyncio
import os
import sys
from typing import Dict, Any

# Add the backend directory to the path
sys.path.append('apps/backend')

load_dotenv()


async def test_smart_summarizer():
    """Test the smart summarizer with different text types."""

    try:
        from apps.backend.app.services.smart_summarizer import get_smart_summarizer
    except ImportError as e:
        print(f"Import error: {e}")
        print("Make sure you've installed the new dependencies: langgraph, langchain, langchain-openai")
        return

    # Test cases with different text types
    test_cases = [
        {
            "name": "Meeting Notes",
            "text": """Had a team meeting about the new project. We talked about deadlines, who's doing what, and how much budget we have left. Also discussed some stuff coming up and what might go wrong. Need to follow up on a few things next week. Sarah will handle the frontend development by March 15th. Mike is responsible for the database migration which should be completed by March 10th. The total budget remaining is $15,000 and we need to be careful not to exceed it. Potential risks include delayed API integration from the third-party service and possible performance issues with the new authentication system. Action items: schedule follow-up meeting for next Tuesday, get quotes from three vendors for hosting services, and finalize the user testing plan.""",
            "expected_type": "meeting"
        },
        {
            "name": "Technical Article",
            "text": """Microservices architecture has become increasingly popular in modern software development due to its ability to provide scalability, flexibility, and maintainability. Unlike monolithic applications where all components are tightly coupled, microservices break down applications into smaller, independent services that communicate through well-defined APIs. Each service can be developed, deployed, and scaled independently, allowing teams to work on different components simultaneously. However, this approach also introduces complexity in terms of service coordination, data consistency, and network communication. Organizations must carefully consider factors such as team size, technical expertise, and infrastructure capabilities before adopting microservices. The benefits include improved fault isolation, technology diversity, and easier continuous deployment, while challenges include increased operational overhead, distributed system complexity, and the need for robust monitoring and testing strategies.""",
            "expected_type": "article"
        },
        {
            "name": "Email",
            "text": """Hi team, I wanted to follow up on our discussion from yesterday's meeting about the Q1 budget review. As we discussed, we need to finalize our spending priorities by end of week. Please review the attached spreadsheet and provide your feedback on the proposed allocations. Specifically, I need your input on: 1) Marketing budget increase for the new campaign, 2) Additional hiring for the engineering team, 3) Software licensing renewals. If you have any concerns or suggestions, please let me know by Thursday so we can discuss them in Friday's budget meeting. Also, don't forget that the quarterly review presentation is due next Monday. Thanks, John""",
            "expected_type": "email"
        }
    ]

    # Test with the example that was problematic (205 words → 96 words = 53% reduction)
    problematic_text = "Had a team meeting about the new project. We talked about deadlines, who's doing what, and how much budget we have left. Also discussed some stuff coming up and what might go wrong. Need to follow up on a few things next week." * 10  # Make it longer to simulate the 205-word case

    print("🚀 Testing Smart Summarizer with LangGraph Pipeline")
    print("=" * 60)

    summarizer = get_smart_summarizer()

    for i, test_case in enumerate(test_cases, 1):
        print(f"\n📝 Test Case {i}: {test_case['name']}")
        print("-" * 40)

        original_words = len(test_case["text"].split())
        print(f"Original text: {original_words} words")

        try:
            result = await summarizer.summarize(test_case["text"], max_length=200)

            summary_words = len(result["summary"].split())
            compression_ratio = 1 - (summary_words / original_words)

            print(f"Summary: {summary_words} words")
            print(f"Compression ratio: {compression_ratio:.2%}")
            print(f"Detected text type: {result['analysis']['text_type']}")
            print(f"Quality score: {result['analysis']['quality_score']}/10")

            # Check if detection was correct
            expected_match = result['analysis']['text_type'] == test_case['expected_type']
            print(
                f"Type detection: {'✅ Correct' if expected_match else '❌ Incorrect'}")

            print(f"\n📄 Summary:")
            print(f'"{result["summary"]}"')

            print(f"\n🔑 Key Points ({len(result['key_points'])}):")
            for j, point in enumerate(result['key_points'][:3], 1):
                print(f"  {j}. {point}")

            if result['errors']:
                print(f"\n⚠️ Errors: {result['errors']}")

        except Exception as e:
            print(f"❌ Error: {e}")

    # Test the problematic case
    print(f"\n🎯 Testing Problematic Case (High Word Count)")
    print("-" * 40)

    original_words = len(problematic_text.split())
    print(f"Original text: {original_words} words")

    try:
        # More aggressive compression
        result = await summarizer.summarize(problematic_text, max_length=50)

        summary_words = len(result["summary"].split())
        compression_ratio = 1 - (summary_words / original_words)

        print(f"Summary: {summary_words} words")
        print(f"Compression ratio: {compression_ratio:.2%}")
        print(f"Target: >80% compression (vs previous 53%)")

        improvement = compression_ratio > 0.8
        print(f"Improvement: {'✅ Better' if improvement else '❌ Needs work'}")

        print(f"\n📄 Compressed Summary:")
        print(f'"{result["summary"]}"')

    except Exception as e:
        print(f"❌ Error: {e}")

    print(f"\n🎉 Testing completed!")

if __name__ == "__main__":
    if not os.getenv('OPENAI_API_KEY'):
        print("❌ Error: OPENAI_API_KEY environment variable not set")
        print("Please set your OpenAI API key:")
        print("export OPENAI_API_KEY='your-key-here'")
        sys.exit(1)

    asyncio.run(test_smart_summarizer())
