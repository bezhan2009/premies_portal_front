import { useEffect, useState } from "react";

const TEST_TIME = 30 * 60;

function TestTimer({ onTimeEnd }) {
  const [timeLeft, setTimeLeft] = useState(() => {
    const saved = localStorage.getItem("test_time_left");
    return saved ? Number(saved) : TEST_TIME;
  });

  useEffect(() => {
    if (timeLeft <= 0) {
      onTimeEnd();
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        localStorage.setItem("test_time_left", prev - 1);
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft, onTimeEnd]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div>
      Осталось времени: {minutes}:{seconds.toString().padStart(2, "0")}
    </div>
  );
}

export default TestTimer;
