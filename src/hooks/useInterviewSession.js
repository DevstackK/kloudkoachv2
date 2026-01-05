import { useState } from "react";
import { v4 as uuidv4 } from "uuid";

export const useInterviewSession = () => {
  const [sessionId, setSessionId] = useState(uuidv4());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [agentResponse, setAgentResponse] = useState(null);

  const startSession = async (formData) => {
    setLoading(true);
    setError(null);

    try {
      const payload = {
        cv: formData.cv, // can be base64 or plain text
        job_role: formData.jobRole,
        interview_round: formData.interviewRound,
        job_description: formData.jobDescription,
        session_id: sessionId,
      };

      const response = await fetch(
        "https://kloudstack.online/webhook-test/2217acfc-6e14-4023-a441-e4a0151876b5",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) throw new Error("Failed to contact agent");

      const data = await response.json();
      setAgentResponse(data);
      console.log("✅ Agent Response:", data);
    } catch (err) {
      setError(err.message);
      console.error("❌ Agent request error:", err);
    } finally {
      setLoading(false);
    }
  };

  return {
    sessionId,
    loading,
    error,
    agentResponse,
    startSession,
  };
};
