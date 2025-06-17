import React, { useState } from 'react';

// Reusable button component for our calculator
const CalcButton = ({ onClick, children, className = '' }) => (
  <button 
    onClick={() => onClick(children)}
    className={`bg-gray-600 hover:bg-gray-500 text-white font-bold py-4 rounded-lg text-xl transition-colors ${className}`}
  >
    {children}
  </button>
);

const CalculatorApplet = () => {
  const [display, setDisplay] = useState('0');
  const [firstOperand, setFirstOperand] = useState(null);
  const [operator, setOperator] = useState(null);
  const [waitingForSecondOperand, setWaitingForSecondOperand] = useState(false);

  const handleDigitClick = (digit) => {
    if (waitingForSecondOperand) {
      setDisplay(String(digit));
      setWaitingForSecondOperand(false);
    } else {
      setDisplay(display === '0' ? String(digit) : display + digit);
    }
  };

  const handleDecimalClick = () => {
    if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  const handleOperatorClick = (nextOperator) => {
    const inputValue = parseFloat(display);

    if (operator && !waitingForSecondOperand) {
      const result = calculate(firstOperand, inputValue, operator);
      setDisplay(String(result));
      setFirstOperand(result);
    } else {
      setFirstOperand(inputValue);
    }

    setWaitingForSecondOperand(true);
    setOperator(nextOperator);
  };

  const calculate = (op1, op2, op) => {
    switch (op) {
      case '+': return op1 + op2;
      case '-': return op1 - op2;
      case '×': return op1 * op2;
      case '÷': return op1 / op2;
      default: return op2;
    }
  };

  const handleEqualsClick = () => {
    const inputValue = parseFloat(display);
    if (operator && !waitingForSecondOperand) {
      const result = calculate(firstOperand, inputValue, operator);
      setDisplay(String(result));
      setFirstOperand(null);
      setOperator(null);
    }
  };

  const handleClearClick = () => {
    setDisplay('0');
    setFirstOperand(null);
    setOperator(null);
    setWaitingForSecondOperand(false);
  };

  return (
    <div className="p-2">
      {/* Display Screen */}
      <div className="bg-gray-900 text-white text-4xl text-right font-mono p-4 rounded-lg mb-2 overflow-x-auto">
        {display}
      </div>
      {/* Calculator Buttons */}
      <div className="grid grid-cols-4 gap-2">
        <CalcButton onClick={handleClearClick} className="col-span-2 bg-red-600 hover:bg-red-500">C</CalcButton>
        <CalcButton onClick={handleOperatorClick}>÷</CalcButton>
        <CalcButton onClick={handleOperatorClick}>×</CalcButton>
        <CalcButton onClick={handleDigitClick}>7</CalcButton>
        <CalcButton onClick={handleDigitClick}>8</CalcButton>
        <CalcButton onClick={handleDigitClick}>9</CalcButton>
        <CalcButton onClick={handleOperatorClick}>-</CalcButton>
        <CalcButton onClick={handleDigitClick}>4</CalcButton>
        <CalcButton onClick={handleDigitClick}>5</CalcButton>
        <CalcButton onClick={handleDigitClick}>6</CalcButton>
        <CalcButton onClick={handleOperatorClick}>+</CalcButton>
        <CalcButton onClick={handleDigitClick}>1</CalcButton>
        <CalcButton onClick={handleDigitClick}>2</CalcButton>
        <CalcButton onClick={handleDigitClick}>3</CalcButton>
        <CalcButton onClick={handleEqualsClick} className="row-span-2 bg-blue-600 hover:bg-blue-500">=</CalcButton>
        <CalcButton onClick={handleDigitClick} className="col-span-2">0</CalcButton>
        <CalcButton onClick={handleDecimalClick}>.</CalcButton>
      </div>
    </div>
  );
};

export default CalculatorApplet;