import React, { useState, useEffect } from 'react';

const CountdownTimer = ({ initialTime, onEnd }) => {
  const [timeLeft, setTimeLeft] = useState(initialTime);

  useEffect(() => {
    // Calculate the end time
    const endTime = Date.now() + initialTime * 1000;

    const updateCountdown = () => {
      const now = Date.now();
      const timeRemaining = Math.max(0, Math.floor((endTime - now) / 1000));
      setTimeLeft(timeRemaining);

      if (timeRemaining <= 0) {
        clearInterval(intervalId);
        onEnd();  // Call the onEnd callback when the countdown finishes
      }
    };

    // Update the countdown every second
    const intervalId = setInterval(updateCountdown, 1000);

    // Call updateCountdown immediately to avoid initial delay
    updateCountdown();

    // Clean up the interval on component unmount
    return () => clearInterval(intervalId);
  }, [initialTime, onEnd]);

  return (
    <div>
      {timeLeft > 0 ? (
        <div id="countdown">{timeLeft}</div>
      ) : (
        <div id="countdown">Time's up!</div>
      )}
    </div>
  );
};

export default CountdownTimer;
