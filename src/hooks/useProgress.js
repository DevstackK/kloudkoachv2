import { useState, useCallback } from 'react';

export const useProgress = () => {
  const [showProgress, setShowProgress] = useState(false);
  const [progressTitle, setProgressTitle] = useState("");
  const [progressMessage, setProgressMessage] = useState("");
  const [progressValue, setProgressValue] = useState(0);

  const showProgressOverlay = useCallback((title, message, progress = 0) => {
    setProgressTitle(title);
    setProgressMessage(message);
    setProgressValue(progress);
    setShowProgress(true);
  }, []);

  const hideProgressOverlay = useCallback(() => {
    setShowProgress(false);
    setProgressTitle("");
    setProgressMessage("");
    setProgressValue(0);
  }, []);

  const updateProgress = useCallback((message, progress) => {
    setProgressMessage(message);
    setProgressValue(progress);
  }, []);

  return {
    showProgress,
    progressTitle,
    progressMessage,
    progressValue,
    showProgressOverlay,
    hideProgressOverlay,
    updateProgress
  };
};