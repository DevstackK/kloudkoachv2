import { createContext, useContext, useState } from "react";

const InterviewContext = createContext();

export function InterviewProvider({ children }) {
  const [sessionData, setSessionData] = useState(null);
  const [transcript, setTranscript] = useState([]);
  const [rating, setRating] = useState(null);

  const value = {
    sessionData,
    setSessionData,
    transcript,
    setTranscript,
    rating,
    setRating,
  };

  return (
    <InterviewContext.Provider value={value}>
      {children}
    </InterviewContext.Provider>
  );
}

export const useInterview = () => useContext(InterviewContext);
