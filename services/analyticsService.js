export const computeAnalytics = (session) => {
  const total = session.scores.length;

  if (total === 0) {
    return {
      avgScore: 0,
      totalQuestions: 0,
    };
  }

  const avgScore = session.scores.reduce((acc, s) => acc + s.score, 0) / total;

  return {
    avgScore: Number(avgScore.toFixed(2)),
    totalQuestions: total,
  };
};
