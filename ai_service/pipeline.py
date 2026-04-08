from llm import generate_tasks_and_queries, extract_solutions, generate_final_tasks
from search import search_web


def research_online(project_description):
    result = generate_tasks_and_queries(project_description)

    all_search_results = []
    for task in result.get("tasks", []):
        for query in task.get("queries", []):
            try:
                results = search_web(query)
                all_search_results.extend(results)
            except Exception as e:
                print(f"Search failed for {query}: {e}")

    if all_search_results:
        combined_title = ", ".join(t.get("title", "") for t in result.get("tasks", []))
        solutions = extract_solutions(combined_title, all_search_results)
        return {"suggestedTasks": solutions.get("solutions", [])}
    
    return {"suggestedTasks": []}


def build_roadmap(project_description, suggested_tasks):
    result = generate_final_tasks(project_description, suggested_tasks)
    return {"tasks": result.get("tasks", [])}