from llm import generate_tasks_and_queries, extract_solutions
from search import search_web


def generate_planning(project_description):

    result = generate_tasks_and_queries(project_description)

    tasks_output = []

    for task in result["tasks"]:

        search_results = []

        for query in task["queries"]:
            results = search_web(query)
            search_results.extend(results)

        solutions = extract_solutions(
            task["title"],
            search_results
        )

        tasks_output.append({
            "title": task["title"],
            "description": task["description"],
            "queries": task["queries"],
            "solutions": solutions["solutions"]
        })

    return {
        "tasks": tasks_output
    }

print(generate_planning("roadmap generation AI agent"))