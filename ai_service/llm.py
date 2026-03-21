from langchain_core.prompts import PromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI
from dotenv import load_dotenv
import json

load_dotenv()

model = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    temperature=0.1,
)

# task and query generation prompt
task_template = """
You are an expert planner and researcher.

Your job is to break a project or goal into clear, meaningful planning tasks and generate search queries to find existing approaches, examples, or solutions.

INSTRUCTIONS:
- Break the project into 2-4 HIGH-LEVEL, actionable tasks
- Each task should represent a meaningful step toward completing the project
- Avoid vague tasks like "do research" or "work on project"
- Tasks should be practical and understandable in any domain

FOR EACH TASK:
- Provide a concise title (max 8 words)
- Provide a clear description (1-2 sentences)
- Generate EXACTLY 3 high-quality search queries
- Queries should be specific and designed to find real examples, guides, or similar existing solutions

OUTPUT RULES:
- Return ONLY valid JSON
- Do NOT include explanations, markdown, or extra text
- Ensure proper JSON formatting

FORMAT:
{{
  "tasks": [
    {{
      "title": "",
      "description": "",
      "queries": ["", "", ""]
    }}
  ]
}}

PROJECT:
{project}
"""

task_prompt = PromptTemplate.from_template(task_template)

task_chain = task_prompt | model


def generate_tasks_and_queries(project_description):

    response = task_chain.invoke({
        "project": project_description
    })

    content = response.content.strip("```json").strip("```")

    return json.loads(content)


# solution extraction prompt
solution_template = """
You are an expert researcher.

Your job is to analyze search results and extract useful, real-world solutions or approaches relevant to a given task.

INSTRUCTIONS:
- Review the search results carefully
- Identify practical solutions, methods, tools, case studies, or approaches
- Focus on useful and actionable insights
- Ignore irrelevant or low-quality results

FOR EACH SOLUTION:
- "name": the name of the solution, method, tool, or approach
- "description": a short explanation of what it is and why it is useful (1-2 sentences)
- "source": a URL if available, otherwise best available reference

CONSTRAINTS:
- Return 2-4 high-quality solutions (fewer if limited relevant data)
- Do NOT invent or hallucinate solutions — use only the provided results
- Avoid duplicates or very similar entries

OUTPUT RULES:
- Return ONLY valid JSON
- Do NOT include explanations, markdown, or extra text

FORMAT:
{{
  "solutions": [
    {{
      "name": "",
      "description": "",
      "source": ""
    }}
  ]
}}

TASK:
{task}

SEARCH RESULTS:
{results}
"""

solution_prompt = PromptTemplate.from_template(solution_template)

solution_chain = solution_prompt | model


def extract_solutions(task, results):

    response = solution_chain.invoke({
        "task": task,
        "results": results
    })

    content = response.content.strip("```json").strip("```")

    return json.loads(content)

# print(generate_tasks_and_queries("Ideas for a roadmap generation AI agent"))