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
Break the following project into 2-4 planning tasks.

For EACH task generate 3 technical web search queries to find existing implementations.

Return ONLY valid JSON.

Format:
{{
 "tasks":[
  {{
   "title":"",
   "description":"",
   "queries":[]
  }}
 ]
}}

Project:
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
Based on the following web search results, extract useful implementation solutions.

Return ONLY JSON.

Format:
{{
 "solutions":[
   {{
    "name":"",
    "description":"",
    "source":""
   }}
 ]
}}

Task:
{task}

Search Results:
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