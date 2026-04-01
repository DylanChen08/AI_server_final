#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
测试代码示例
包含多种测试场景的单元测试
"""

import unittest
from datetime import datetime
from typing import List, Optional


# 示例被测试的类
class Calculator:
    """简单的计算器类"""
    
    def add(self, a: int, b: int) -> int:
        """加法运算"""
        return a + b
    
    def divide(self, a: int, b: int) -> float:
        """除法运算"""
        if b == 0:
            raise ValueError("除数不能为零")
        return a / b
    
    def get_current_time(self) -> str:
        """获取当前时间字符串"""
        return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


class TestCalculator(unittest.TestCase):
    """Calculator 类的测试用例"""
    
    def setUp(self):
        """每个测试方法执行前的准备工作"""
        self.calculator = Calculator()
        print("\n--- 测试开始 ---")
    
    def tearDown(self):
        """每个测试方法执行后的清理工作"""
        print("--- 测试结束 ---")
    
    def test_add_positive_numbers(self):
        """测试正数相加"""
        result = self.calculator.add(2, 3)
        self.assertEqual(result, 5)
    
    def test_add_negative_numbers(self):
        """测试负数相加"""
        result = self.calculator.add(-2, -3)
        self.assertEqual(result, -5)
    
    def test_add_mixed_numbers(self):
        """测试混合数字相加"""
        result = self.calculator.add(-2, 5)
        self.assertEqual(result, 3)
    
    def test_divide_normal(self):
        """测试正常除法"""
        result = self.calculator.divide(10, 2)
        self.assertEqual(result, 5.0)
    
    def test_divide_by_zero(self):
        """测试除以零的情况"""
        with self.assertRaises(ValueError):
            self.calculator.divide(10, 0)
    
    def test_get_current_time_format(self):
        """测试时间格式"""
        result = self.calculator.get_current_time()
        # 验证时间格式是否正确
        self.assertRegex(result, r'\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}')


class TestDataProcessing(unittest.TestCase):
    """数据处理相关的测试"""
    
    def test_list_operations(self):
        """测试列表操作"""
        test_list = [1, 2, 3, 4, 5]
        self.assertEqual(len(test_list), 5)
        self.assertIn(3, test_list)
        self.assertNotIn(6, test_list)
    
    def test_string_operations(self):
        """测试字符串操作"""
        test_string = "Hello World"
        self.assertTrue(test_string.startswith("Hello"))
        self.assertTrue(test_string.endswith("World"))
        self.assertEqual(test_string.lower(), "hello world")
    
    def test_none_handling(self):
        """测试 None 值处理"""
        value: Optional[str] = None
        self.assertIsNone(value)
        
        value = "not none"
        self.assertIsNotNone(value)


def run_tests():
    """运行所有测试"""
    # 创建测试套件
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # 添加测试类
    suite.addTests(loader.loadTestsFromTestCase(TestCalculator))
    suite.addTests(loader.loadTestsFromTestCase(TestDataProcessing))
    
    # 运行测试
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # 返回测试结果
    return result.wasSuccessful()


if __name__ == '__main__':
    # 运行测试
    success = run_tests()
    
    # 输出最终结果
    if success:
        print("\n✅ 所有测试通过！")
    else:
        print("\n❌ 部分测试失败！")
