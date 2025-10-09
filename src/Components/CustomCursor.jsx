// src/components/CustomCursor.js
import { useEffect, useState } from "react";


const CustomCursor = () => {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const onMouseMove = (event) => {
      setPosition({ x: event.clientX, y: event.clientY });
    };

    window.addEventListener("mousemove", onMouseMove);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  return (
    <div
      className="custom-cursor"
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
    />
  );
};

export default CustomCursor;
