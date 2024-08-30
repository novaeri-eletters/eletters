import React, { useState, useEffect } from "react";
import Confetti from 'react-confetti';
import './shatter.css'; // Assuming you create this CSS file for the shattering effect

const SummerTriangleInvite = () => {
  const [showYesPage, setShowYesPage] = useState(false);
  const [startMoving, setStartMoving] = useState(false);
  const [noButtonPosition, setNoButtonPosition] = useState({
    left: "60%",
    top: "60%",
  });
  const [hearts, setHearts] = useState([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [hoverCount, setHoverCount] = useState(0);
  const [hasTransformed, setHasTransformed] = useState(false);
  const [showSecondYes, setShowSecondYes] = useState(false);
  const [shatter, setShatter] = useState(false); // State for shattering effect

  useEffect(() => {
    const interval = setInterval(updateHearts, 50);
    return () => clearInterval(interval);
  }, []);

  const handleYesClick = () => {
    setShowYesPage(true);
    setShowConfetti(true);
  };

  const moveButton = () => {
    if (hasTransformed || shatter) return;

    const buttonWidth = 100;
    const buttonHeight = 50;
    const padding = 10;

    const availableWidth = window.innerWidth - buttonWidth - padding - 200;
    const availableHeight = window.innerHeight - buttonHeight - padding - 100;

    const x = Math.random() * availableWidth;
    const y = Math.random() * availableHeight;

    setNoButtonPosition({ left: `${x + padding}px`, top: `${y + padding}px` });
    setStartMoving(true);
  };

  const handleMouseMove = (e) => {
    if (hasTransformed || shatter) return;

    const distanceX = Math.abs(e.clientX - parseInt(noButtonPosition.left));
    const distanceY = Math.abs(e.clientY - parseInt(noButtonPosition.top));

    if (distanceX < 100 && distanceY < 100) {
      setHoverCount(hoverCount + 1);
      moveButton();

      if (hoverCount >= 5) {
        triggerShatterEffect();
      }
    }
  };

  const triggerShatterEffect = () => {
    setShatter(true);
    setTimeout(() => {
      destroyNoButton();
    }, 1500); // 1.5 seconds delay for the shattering effect
  };

  const destroyNoButton = () => {
    setShowSecondYes(true);
    setStartMoving(false);
    setHasTransformed(true);
    for (let i = 0; i < 20; i++) {
      createHeart(parseInt(noButtonPosition.left), parseInt(noButtonPosition.top));
    }
  };

  const createHeart = (x, y) => {
    const heart = {
      id: Math.random().toString(36).substr(2, 9),
      x: x,
      y: y,
      size: Math.random() * 20 + 10,
      speedX: Math.random() * 2 - 1,
      speedY: Math.random() * -2 - 1,
      opacity: 1,
    };
    setHearts((prevHearts) => [...prevHearts, heart]);
  };

  const updateHearts = () => {
    setHearts((prevHearts) =>
      prevHearts
        .map((heart) => ({
          ...heart,
          x: heart.x + heart.speedX,
          y: heart.y + heart.speedY,
          opacity: heart.opacity - 0.02,
        }))
        .filter((heart) => heart.opacity > 0)
    );
  };

  if (showYesPage) {
    return (
      <div style={styles.yesContainer}>
        {showConfetti && <Confetti />}
      </div>
    );
  }

  return (
    <div style={styles.container} onMouseMove={handleMouseMove}>
      <h1 style={styles.headerText}>Deneb, Altair, and Vega invited you to visit the Summer Triangle!</h1>
      <img
        src="https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExcDdtZ2JiZDR0a3lvMWF4OG8yc3p6Ymdvd3g2d245amdveDhyYmx6eCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/cLS1cfxvGOPVpf9g3y/giphy.gif"
        alt="Cute animated illustration"
        style={styles.centerGif}  // Central GIF styling
      />
      <div style={styles.buttonsContainer}>
        <button
          style={styles.yesButton}
          onClick={handleYesClick}
          onMouseEnter={(e) => {
            for (let i = 0; i < 10; i++) {
              createHeart(e.clientX, e.clientY);
            }
          }}
        >
          Yes
        </button>

        {showSecondYes ? (
          <button
            style={{
              ...styles.yesButton,
              left: noButtonPosition.left,
              top: noButtonPosition.top,
              position: "absolute",
            }}
            onClick={handleYesClick}
          >
            Yes 😌
          </button>
        ) : (
          <button
            style={{
              ...styles.noButton,
              left: noButtonPosition.left,
              top: noButtonPosition.top,
              position: startMoving ? "absolute" : "initial",
            }}
            onMouseOver={moveButton}
            className={shatter ? "shatter" : ""} // Add shattering effect class
          >
            No
          </button>
        )}
      </div>

      {hearts.map((heart) => (
        <div
          key={heart.id}
          style={{
            ...styles.heart,
            left: heart.x,
            top: heart.y,
            width: heart.size,
            height: heart.size,
            opacity: heart.opacity,
            backgroundColor: "lightblue",
            borderRadius: "50%",
            transform: "translate(-50%, -50%)",
          }}
        >
          🌟
        </div>
      ))}

      <div style={styles.heartContainer}>
        <iframe
          src="/heart.html"
          style={styles.iframe}
          title="Heart Effect"
        ></iframe>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    backgroundImage: "url('https://cdn.esahubble.org/archives/images/screen/heic0807c.jpg')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    position: "relative",
    textAlign: "center",
    overflow: "hidden",
    margin: 0,
    padding: 0,
    boxSizing: "border-box",
  },
  headerText: {
    fontFamily: "Nunito",
    fontSize: "2.5rem",
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: "20px",
    textShadow: "2px 2px 4px #000000",
    paddingTop: "20px", // Added padding from the top
  },
  centerGif: {  // Style for central GIF
    maxWidth: "40%",
    height: "auto",
    marginBottom: "20px",
  },
  buttonsContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    height: "100px",
  },
  yesButton: {
    padding: "15px 30px",
    fontSize: "1.5rem",
    cursor: "pointer",
    backgroundColor: "#8A2BE2",
    border: "none",
    borderRadius: "10px",
    color: "#FFFFFF",
    transition: "transform 0.2s",
    marginRight: "20px",
    boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.3)",
    animation: "pulse 1.5s infinite",
  },
  noButton: {
    padding: "15px 30px",
    fontSize: "1.5rem",
    cursor: "pointer",
    backgroundColor: "#8A2BE2",
    border: "none",
    borderRadius: "10px",
    color: "#FFFFFF",
    transition: "transform 0.05s, left 0.1s ease, top 0.1s ease",
    boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.3)",
  },
  heartContainer: {
    position: "absolute",
    bottom: "10px",
    left: "10px",
    display: "flex",
    alignItems: "flex-end",
  },
  heart: {
    position: "absolute",
    fontSize: "20px",
    zIndex: 9999,
    pointerEvents: "none",
  },
  iframe: {
    width: "185px",
    height: "185px",
    border: "none",
    backgroundColor: "transparent",  // Transparent background for the iframe
  },
  yesContainer: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-start", // Align text to the top
    alignItems: "center",
    height: "100vh",
    backgroundImage: "url('https://ih1.redbubble.net/image.1678017596.0910/bg,f8f8f8-flat,750x,075,f-pad,750x1000,f8f8f8.jpg')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    textAlign: "center",
    padding: "20px",
  },
  yesText: {
    fontFamily: "Nunito",
    fontSize: "2.5rem",
    fontWeight: "bold",
    color: "#FFFFFF",
    textShadow: "2px 2px 4px #000000",
    marginTop: "20px", // Add some margin to the top
  },
  "@keyframes pulse": {
    "0%": { transform: "scale(1)" },
    "50%": { transform: "scale(1.1)" },
    "100%": { transform: "scale(1)" },
  },
};

export default SummerTriangleInvite;
