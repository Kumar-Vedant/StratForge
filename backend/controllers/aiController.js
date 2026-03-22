const generatePlanning = async (req, res) => {
  const { projectDescription } = req.body;

  if (!projectDescription) {
    return res.status(400).json({
      success: false,
      error: "Missing projectDescription",
    });
  }

  try {
    const aiResponse = await fetch("http://localhost:8001/generate-planning", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ projectDescription }),
    });

    if (!aiResponse.ok) {
        throw new Error(`AI service responded with status ${aiResponse.status}`);
    }

    const data = await aiResponse.json();

    res.status(200).json({
      success: true,
      data: data,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error,
    });
  }
};

export default {
  generatePlanning,
};
