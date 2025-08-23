// Mock AI wrapper — plug in OpenAI later

export const mockAIResponse = (careerInput) => {
  return {
    skills: ["HTML", "CSS", "JavaScript", "React", "Node.js"],
    roadmap: [
      { week: 1, task: "Learn HTML & CSS" },
      { week: 2, task: "Master JavaScript basics" },
      { week: 3, task: "Build a simple frontend" },
      { week: 4, task: "Learn Node.js and Express" },
    ],
    projects: [
      { title: "Portfolio Website", level: "Beginner" },
      { title: "To-Do API", level: "Intermediate" },
    ],
    resources: [
      { title: "MDN HTML Docs", type: "docs", link: "https://developer.mozilla.org" },
      { title: "freeCodeCamp JavaScript Course", type: "video", link: "https://youtube.com" },
    ],
  };
};


