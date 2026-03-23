from llm import generate_tasks_and_queries, extract_solutions
from search import search_web


def generate_planning(project_description):

    result = generate_tasks_and_queries(project_description)

    # Collect ALL search results across ALL tasks first
    all_search_results = []
    for task in result["tasks"]:
        for query in task["queries"]:
            results = search_web(query)
            all_search_results.extend(results)

    # Call extract_solutions ONCE with all aggregated results
    combined_title = ", ".join(t["title"] for t in result["tasks"])
    solutions = extract_solutions(combined_title, all_search_results)

    simple_tasks = [
        {"title": t["title"], "description": t["description"]}
        for t in result["tasks"]
    ]

    detailed = [{
        "title": combined_title,
        "description": "Aggregated planning tasks",
        "queries": [q for t in result["tasks"] for q in t["queries"]],
        "solutions": solutions["solutions"]
    }]

    return {
        "tasks": simple_tasks,
        "detailed": detailed
    }

# print(generate_planning("roadmap generation AI agent"))