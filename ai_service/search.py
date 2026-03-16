from tavily import TavilyClient
import os
from dotenv import load_dotenv

load_dotenv()

client = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))


def search_web(query):

    results = client.search(
        query=query,
        max_results=3
    )

    return results["results"]

# query = "roadmap generation AI"
# print(search_web(query))