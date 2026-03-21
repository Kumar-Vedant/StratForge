from llm import generate_tasks_and_queries, extract_solutions
from search import search_web


def generate_planning(project_description):

    result = generate_tasks_and_queries(project_description)

    detailed_tasks = []
    simple_tasks = []

    for task in result["tasks"]:

        search_results = []

        for query in task["queries"]:
            results = search_web(query)
            search_results.extend(results)

        solutions = extract_solutions(
            task["title"],
            search_results
        )

        detailed_task = {
            "title": task["title"],
            "description": task["description"],
            "queries": task["queries"],
            "solutions": solutions["solutions"]
        }

        detailed_tasks.append(detailed_task)

        simple_tasks.append({
            "title": task["title"],
            "description": task["description"]
        })

    return {
        "tasks": simple_tasks,
        "detailed": detailed_tasks
    }

# print(generate_planning("roadmap generation AI agent"))