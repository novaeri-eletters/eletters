
import { useState, useEffect, useRef, useCallback, memo } from 'react';
import './ValentineRoses.css';

// Memoized ValentineAgreement to prevent unnecessary re-renders
const ValentineAgreement = memo(({ onClose, onAgree }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [coordinates, setCoordinates] = useState({ x: 0, y: 0 });
  const [signature, setSignature] = useState('');
  const [isClosing, setIsClosing] = useState(false);

  // Signature handling inside memoized component
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#ff006e';
    }
  }, []);

  const startDrawing = useCallback((e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    
    setIsDrawing(true);
    setCoordinates({ x, y });
  }, []);

  const draw = useCallback((e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;

    ctx.beginPath();
    ctx.moveTo(coordinates.x, coordinates.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    setCoordinates({ x, y });
  }, [isDrawing, coordinates.x, coordinates.y]);

  const endDrawing = useCallback(() => {
    setIsDrawing(false);
    setSignature(canvasRef.current.toDataURL());
  }, []);

  const clearSignature = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignature('');
  }, []);

  const handleSubmit = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onAgree?.();
      onClose?.();
    }, 500); // Match CSS transition duration
  }, [onAgree, onClose]);

  return (
    <div className={`valentine-letter-overlay ${isClosing ? 'closing' : ''}`}>
      <div className="valentine-letter">
        <div className="kitty-background"></div>
        <h2>Valentine's Agreement 💌</h2>
        <div className="letter-content">
          <p>I, pé Hoà, hereby agree to</p>
          <ul>
            <li>Celebrate Valentine's Day together with Minh</li>
          </ul>
          
          <div className="signature-section">
            <p>Signature:</p>
            <canvas
              ref={canvasRef}
              width="300"
              height="120"
              className="signature-canvas"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={endDrawing}
              onMouseLeave={endDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={endDrawing}
            />
            <button 
              className="clear-button"
              onClick={clearSignature}
            >
              Clear
            </button>
          </div>
          
          <button 
            className="submit-button"
            disabled={!signature}
            onClick={handleSubmit}
          >
            Submit Agreement
          </button>
        </div>
      </div>
    </div>
  );
});

const ValentineRoses = () => {
  const [bloomCount, setBloomCount] = useState(0);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showFinalMessage, setShowFinalMessage] = useState(false);
  const [particles, setParticles] = useState([]);
  const [bloomedRoses, setBloomedRoses] = useState({});
  const [flowerPositions, setFlowerPositions] = useState([]);
  const [selectedAnswer, setSelectedAnswer] = useState(null);

  const messages = [
    "Đôi mắt lộng lẫy của Hoà",
    "Cái mũi xinh xắn của Hoà",
    "Đôi môi mĩ lệ của Hoà",
    "Đôi tai mê hoặc của Hoà",
    "Cặp má êm đềm của Hoà",
    "Cái trán đáng yêu của Hoà",
    "Nụ cười rực rỡ của Hoà",
  ];

  const loveQuestions = [
    {
      question: "Anh yêu ai nhất (lãng mạn, không bất hiếu)",
      options: [
        { text: "Công túa Hoà", value: "314" },
        { text: "Pé Hoà", value: "520" },
        { text: "Hoà chằn lửa ", value: "143" },
        { text: "Sư tử Hoà Đông", value: "141" },
        { text: "Iu hết", value: "849", correct: true },
      ],
      correctAnswer: "849"
    }
  ];

  useEffect(() => {
    const positions = messages.map(() => ({
      bottom: `${20 + Math.random() * 20}%`,
      left: `${1 + Math.random() * 85}%`,
      zIndex: Math.floor(Math.random() * 10),
      height: `${90 + Math.random() * 50}px`
    }));
    setFlowerPositions(positions);
  }, []);

  const handleAnswerSelect = (value) => {
    setSelectedAnswer(value);
    if (value === loveQuestions[0].correctAnswer) {
      setShowFinalMessage(true);
      setShowPasswordModal(false);
      setParticles([...Array(30)].map((_, i) => ({
        id: Date.now() + i,
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight
      })));
    } else {
      const modal = document.querySelector('.love-modal');
      modal.classList.add('heart-beat-error');
      setTimeout(() => modal.classList.remove('heart-beat-error'), 500);
    }
  };

  const handleRoseClick = (index, event) => {
    if (bloomCount < 6) {
      if (!bloomedRoses[index]) {
        setBloomedRoses(prev => ({ ...prev, [index]: true }));
        setBloomCount(c => c + 1);
        setParticles([...Array(8)].map((_, i) => ({
          id: Date.now() + i,
          x: event.clientX,
          y: event.clientY
        })));
      }
    } else {
      setBloomedRoses(prev => ({ ...prev, [index]: true }));
      setBloomCount(c => c + 1);
      setParticles([...Array(8)].map((_, i) => ({
        id: Date.now() + i,
        x: event.clientX,
        y: event.clientY
      })));
      setShowPasswordModal(true);
    }
  };

  const PasswordModal = () => (
    <div className="love-modal-overlay">
      <div className="love-modal romantic-box">
        <div className="modal-heart-decoration"></div>
        <h3>💘 {loveQuestions[0].question} 💘</h3>
        <div className="love-options">
          {loveQuestions[0].options.map((option, index) => (
            <button
              key={index}
              className={`heart-option ${selectedAnswer === option.value ? 'selected' : ''}`}
              onClick={() => handleAnswerSelect(option.value)}
            >
              <span className="option-emoji">🌹</span>
              {option.text}
              {selectedAnswer === option.value && (
                <span className="feedback-emoji">
                  {option.correct ? '💖' : '💔'}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="garden-container">
      {/* Animated butterflies */}
      <Butterfly style={{ left: '10%', top: '30%', animationDelay: '0s' }} />
      <Butterfly style={{ left: '30%', top: '50%', animationDelay: '1s' }} />
      <Butterfly style={{ left: '70%', top: '40%', animationDelay: '2s' }} />

      {/* Field cats */}
      <div className="cat sitting-cat" style={{ left: '5%', bottom: '140px', width: "10px", height: "10px" }}>
        <img style={{  width: "200px" }} src="https://pngimg.com/uploads/cat/cat_PNG50488.png" alt="Sitting cat" />
      </div>
      <div className="cat walking-cat" style={{ right: '10%', bottom: '140px' }}>
        <img src="https://media.tenor.com/OY6_ZTwXWhEAAAAj/cat-pop.gif" alt="Walking cat" />
      </div>


      {/* Buzzing bees */}
      <Bee style={{ left: '20%', top: '20%', animationDelay: '0.5s' }} />
      <Bee style={{ left: '80%', top: '30%', animationDelay: '1.5s' }} />

      {/* Field cats */}
      {/* <div className="cat sitting-cat" style={{ left: '5%', bottom: '140px' }}>😺</div>
      <div className="cat walking-cat" style={{ right: '10%', bottom: '140px' }}>🐈</div> */}

      {particles.map((p) => (
        <div 
          key={p.id}
          className="petal-particle"
          style={{ left: p.x, top: p.y }}
        />
      ))}

      {showPasswordModal && <PasswordModal />}

      <div className="sky-background">
        {/* Original clouds */}
        <div className="cloud cloud-1"></div>
        <div className="cloud cloud-2"></div>
        {/* Additional clouds */}
        <div className="cloud cloud-3"></div>
        <div className="cloud cloud-4"></div>
      </div>
      
      <div className="grass-layer"></div>

      <h1 className="garden-title romantic-text">
        Vườn hoa của những thứ xinh đẹp mà Minh thích
      </h1>

      <div className="flower-garden">
        {messages.map((message, index) => {
          const position = flowerPositions[index] || {};
          return (
            <div 
              key={index}
              className="flower-plant"
              style={{
                bottom: position.bottom,
                left: position.left,
                zIndex: position.zIndex,
                height: position.height
              }}
            >
              <div className="rose-stem" style={{ height: position.height }}></div>
              <button
                onClick={(e) => handleRoseClick(index, e)}
                className={`flower-button 
                  ${bloomCount >= 6 && !bloomedRoses[index] ? 'glowing-rose' : ''} 
                  ${bloomedRoses[index] ? 'bloomed-flower' : ''}`}
                disabled={bloomedRoses[index]}
              >
                <div className="petals">
                  {bloomedRoses[index] ? (
                    <span className="flower-message romantic-text">
                      {message}
                    </span>
                  ) : (
                    <>
                      <div className="petal p1"></div>
                      <div className="petal p2"></div>
                      <div className="petal p3"></div>
                      <div className="center"></div>
                      {bloomCount >= 6 && !bloomedRoses[index] && (
                        <div className="glow-effect"></div>
                      )}
                    </>
                  )}
                </div>
              </button>
            </div>
          );
        })}
      </div>

      {showFinalMessage && (
        <ValentineAgreement 
          onClose={() => setShowFinalMessage(false)}
          onAgree={() => {
            // Add any agreement confirmation logic here
          }}
        />
      )}

      <div className="garden-footer">
        <div className="butterfly"></div>
        <div className="ladybug"></div>
      </div>
    </div>
  );
};

export default ValentineRoses;

const Butterfly = ({ style }) => (
  <div className="butterfly" style={style}>
    <div className="wing left"></div>
    <div className="wing right"></div>
    <div className="body"></div>
  </div>
);

const Bee = ({ style }) => (
  <div className="bee" style={style}>
    <div className="bee-stripe"></div>
    <div className="bee-stripe"></div>
    <div className="bee-stripe"></div>
  </div>
);