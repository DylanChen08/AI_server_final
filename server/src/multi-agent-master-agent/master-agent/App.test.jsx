import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

// 一个简单的测试组件
function Counter() {
  const [count, setCount] = React.useState(0);

  return (
    <div>
      <h1 data-testid="counter-value">{count}</h1>
      <button onClick={() => setCount(count + 1)}>增加</button>
      <button onClick={() => setCount(count - 1)}>减少</button>
    </div>
  );
}

// 测试用例
describe('Counter 组件测试', () => {
  it('应该正确渲染初始值', () => {
    render(<Counter />);
    expect(screen.getByTestId('counter-value')).toHaveTextContent('0');
  });

  it('点击增加按钮应该增加计数', () => {
    render(<Counter />);
    const button = screen.getByText('增加');
    fireEvent.click(button);
    expect(screen.getByTestId('counter-value')).toHaveTextContent('1');
  });

  it('点击减少按钮应该减少计数', () => {
    render(<Counter />);
    const button = screen.getByText('减少');
    fireEvent.click(button);
    expect(screen.getByTestId('counter-value')).toHaveTextContent('-1');
  });

  it('应该可以连续点击多次', () => {
    render(<Counter />);
    const incrementButton = screen.getByText('增加');
    fireEvent.click(incrementButton);
    fireEvent.click(incrementButton);
    fireEvent.click(incrementButton);
    expect(screen.getByTestId('counter-value')).toHaveTextContent('3');
  });
});

export default Counter;
