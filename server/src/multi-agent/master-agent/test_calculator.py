#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
完整的 Python 单元测试示例文件
包含：多个测试用例、setUp/tearDown、参数化测试、边界条件测试、异常测试
"""

import unittest
from unittest.mock import patch, MagicMock
from parameterized import parameterized
import sys
import os

# 添加项目路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


# ============================================
# 被测试的模块（模拟）
# ============================================
class Calculator:
    """计算器类 - 被测试的目标类"""
    
    def __init__(self):
        self.history = []
        self.last_result = 0
    
    def add(self, a, b):
        """加法运算"""
        result = a + b
        self.history.append(f"{a} + {b} = {result}")
        self.last_result = result
        return result
    
    def subtract(self, a, b):
        """减法运算"""
        result = a - b
        self.history.append(f"{a} - {b} = {result}")
        self.last_result = result
        return result
    
    def multiply(self, a, b):
        """乘法运算"""
        result = a * b
        self.history.append(f"{a} * {b} = {result}")
        self.last_result = result
        return result
    
    def divide(self, a, b):
        """除法运算"""
        if b == 0:
            raise ValueError("除数不能为零")
        result = a / b
        self.history.append(f"{a} / {b} = {result}")
        self.last_result = result
        return result
    
    def power(self, base, exponent):
        """幂运算"""
        if exponent < 0 and base == 0:
            raise ValueError("0 不能为负指数")
        result = base ** exponent
        self.history.append(f"{base} ** {exponent} = {result}")
        self.last_result = result
        return result
    
    def get_history(self):
        """获取计算历史"""
        return self.history
    
    def clear_history(self):
        """清空计算历史"""
        self.history = []
    
    def get_last_result(self):
        """获取最后一次计算结果"""
        return self.last_result


# ============================================
# 单元测试类
# ============================================
class TestCalculator(unittest.TestCase):
    """计算器单元测试类"""
    
    # ========== setUp 和 tearDown 方法 ==========
    def setUp(self):
        """每个测试方法执行前运行 - 初始化测试环境"""
        self.calculator = Calculator()
        self.test_data = {
            'positive_numbers': [1, 2, 3, 4, 5],
            'negative_numbers': [-1, -2, -3, -4, -5],
            'zero': 0
        }
        print(f"\n[setUp] 初始化测试环境: {self._testMethodName}")
    
    def tearDown(self):
        """每个测试方法执行后运行 - 清理测试环境"""
        self.calculator.clear_history()
        del self.calculator
        print(f"[tearDown] 清理测试环境: {self._testMethodName}")
    
    # ========== 类级别的 setUp 和 tearDown ==========
    @classmethod
    def setUpClass(cls):
        """所有测试方法执行前运行一次"""
        print("\n" + "="*60)
        print("[setUpClass] 开始执行测试套件")
        print("="*60)
    
    @classmethod
    def tearDownClass(cls):
        """所有测试方法执行后运行一次"""
        print("\n" + "="*60)
        print("[tearDownClass] 测试套件执行完成")
        print("="*60)
    
    # ========== 基础功能测试 ==========
    def test_add_positive_numbers(self):
        """测试正数加法"""
        result = self.calculator.add(2, 3)
        self.assertEqual(result, 5)
        self.assertEqual(self.calculator.get_last_result(), 5)
    
    def test_add_negative_numbers(self):
        """测试负数加法"""
        result = self.calculator.add(-2, -3)
        self.assertEqual(result, -5)
    
    def test_add_mixed_numbers(self):
        """测试混合数字加法"""
        result = self.calculator.add(-2, 5)
        self.assertEqual(result, 3)
    
    def test_subtract_positive_numbers(self):
        """测试正数减法"""
        result = self.calculator.subtract(5, 3)
        self.assertEqual(result, 2)
    
    def test_multiply_positive_numbers(self):
        """测试正数乘法"""
        result = self.calculator.multiply(4, 5)
        self.assertEqual(result, 20)
    
    def test_multiply_by_zero(self):
        """测试乘以零"""
        result = self.calculator.multiply(100, 0)
        self.assertEqual(result, 0)
    
    # ========== 参数化测试 ==========
    @parameterized.expand([
        ("正数加法_1", 2, 3, 5),
        ("正数加法_2", 10, 20, 30),
        ("正数加法_3", 100, 200, 300),
        ("负数加法_1", -2, -3, -5),
        ("负数加法_2", -10, -20, -30),
        ("混合加法_1", -5, 10, 5),
        ("混合加法_2", 5, -10, -5),
        ("含零加法_1", 0, 5, 5),
        ("含零加法_2", 5, 0, 5),
        ("含零加法_3", 0, 0, 0),
    ])
    def test_add_parameterized(self, name, a, b, expected):
        """参数化测试 - 加法运算"""
        result = self.calculator.add(a, b)
        self.assertEqual(result, expected, f"测试用例: {name}")
    
    @parameterized.expand([
        ("正数减法_1", 10, 5, 5),
        ("正数减法_2", 100, 50, 50),
        ("负数减法_1", -10, -5, -5),
        ("混合减法_1", 5, 10, -5),
        ("含零减法_1", 0, 5, -5),
        ("含零减法_2", 5, 0, 5),
    ])
    def test_subtract_parameterized(self, name, a, b, expected):
        """参数化测试 - 减法运算"""
        result = self.calculator.subtract(a, b)
        self.assertEqual(result, expected, f"测试用例: {name}")
    
    @parameterized.expand([
        ("正数乘法_1", 2, 3, 6),
        ("正数乘法_2", 10, 10, 100),
        ("负数乘法_1", -2, -3, 6),
        ("混合乘法_1", -2, 3, -6),
        ("含零乘法_1", 0, 100, 0),
        ("含零乘法_2", 100, 0, 0),
    ])
    def test_multiply_parameterized(self, name, a, b, expected):
        """参数化测试 - 乘法运算"""
        result = self.calculator.multiply(a, b)
        self.assertEqual(result, expected, f"测试用例: {name}")
    
    @parameterized.expand([
        ("正数除法_1", 10, 2, 5.0),
        ("正数除法_2", 100, 4, 25.0),
        ("负数除法_1", -10, 2, -5.0),
        ("混合除法_1", 10, -2, -5.0),
        ("小数除法_1", 7, 2, 3.5),
    ])
    def test_divide_parameterized(self, name, a, b, expected):
        """参数化测试 - 除法运算"""
        result = self.calculator.divide(a, b)
        self.assertAlmostEqual(result, expected, places=2, msg=f"测试用例: {name}")
    
    @parameterized.expand([
        ("正数幂_1", 2, 3, 8),
        ("正数幂_2", 10, 2, 100),
        ("负数幂_1", 2, -1, 0.5),
        ("零指数_1", 5, 0, 1),
        ("一指数_1", 5, 1, 5),
    ])
    def test_power_parameterized(self, name, base, exponent, expected):
        """参数化测试 - 幂运算"""
        result = self.calculator.power(base, exponent)
        self.assertAlmostEqual(result, expected, places=2, msg=f"测试用例: {name}")
    
    # ========== 边界条件测试 ==========
    def test_add_boundary_large_numbers(self):
        """测试大数加法边界"""
        result = self.calculator.add(999999999, 1)
        self.assertEqual(result, 1000000000)
    
    def test_add_boundary_float_precision(self):
        """测试浮点数精度边界"""
        result = self.calculator.add(0.1, 0.2)
        self.assertAlmostEqual(result, 0.3, places=10)
    
    def test_subtract_boundary_same_numbers(self):
        """测试相同数字减法边界"""
        result = self.calculator.subtract(5, 5)
        self.assertEqual(result, 0)
    
    def test_multiply_boundary_large_numbers(self):
        """测试大数乘法边界"""
        result = self.calculator.multiply(1000000, 1000000)
        self.assertEqual(result, 1000000000000)
    
    def test_divide_boundary_very_small_result(self):
        """测试除法结果非常小的边界"""
        result = self.calculator.divide(1, 1000000)
        self.assertGreater(result, 0)
        self.assertAlmostEqual(result, 0.000001, places=6)
    
    def test_power_boundary_zero_base(self):
        """测试零底数的幂运算边界"""
        result = self.calculator.power(0, 5)
        self.assertEqual(result, 0)
    
    def test_power_boundary_negative_exponent(self):
        """测试负指数的幂运算边界"""
        result = self.calculator.power(2, -2)
        self.assertAlmostEqual(result, 0.25, places=2)
    
    # ========== 异常测试 ==========
    def test_divide_by_zero_raises_exception(self):
        """测试除以零抛出异常"""
        with self.assertRaises(ValueError) as context:
            self.calculator.divide(10, 0)
        self.assertEqual(str(context.exception), "除数不能为零")
    
    def test_power_zero_negative_exponent_raises_exception(self):
        """测试 0 的负指数幂抛出异常"""
        with self.assertRaises(ValueError) as context:
            self.calculator.power(0, -1)
        self.assertEqual(str(context.exception), "0 不能为负指数")
    
    def test_divide_by_zero_multiple_times(self):
        """测试多次除以零"""
        for i in range(3):
            with self.assertRaises(ValueError):
                self.calculator.divide(i + 1, 0)
    
    # ========== 历史记录功能测试 ==========
    def test_history_records_operations(self):
        """测试历史记录功能"""
        self.calculator.add(2, 3)
        self.calculator.subtract(5, 2)
        self.calculator.multiply(3, 4)
        
        history = self.calculator.get_history()
        self.assertEqual(len(history), 3)
        self.assertIn("2 + 3 = 5", history)
        self.assertIn("5 - 2 = 3", history)
        self.assertIn("3 * 4 = 12", history)
    
    def test_history_clear(self):
        """测试清空历史记录"""
        self.calculator.add(1, 1)
        self.calculator.add(2, 2)
        self.assertEqual(len(self.calculator.get_history()), 2)
        
        self.calculator.clear_history()
        self.assertEqual(len(self.calculator.get_history()), 0)
    
    def test_last_result_tracking(self):
        """测试最后结果追踪"""
        self.calculator.add(1, 1)
        self.assertEqual(self.calculator.get_last_result(), 2)
        
        self.calculator.multiply(3, 3)
        self.assertEqual(self.calculator.get_last_result(), 9)
        
        self.calculator.subtract(10, 5)
        self.assertEqual(self.calculator.get_last_result(), 5)
    
    # ========== Mock 测试 ==========
    @patch('builtins.print')
    def test_with_mock_print(self, mock_print):
        """测试使用 Mock 对象"""
        self.calculator.add(1, 1)
        # 验证 print 没有被调用
        mock_print.assert_not_called()
    
    @patch.object(Calculator, 'add')
    def test_with_mock_method(self, mock_add):
        """测试 Mock 类方法"""
        mock_add.return_value = 100
        result = self.calculator.add(1, 1)
        self.assertEqual(result, 100)
        mock_add.assert_called_once_with(1, 1)
    
    # ========== 断言方法测试 ==========
    def test_assert_methods(self):
        """测试各种断言方法"""
        # assertEqual
        self.assertEqual(1, 1)
        
        # assertNotEqual
        self.assertNotEqual(1, 2)
        
        # assertTrue
        self.assertTrue(True)
        
        # assertFalse
        self.assertFalse(False)
        
        # assertIsNone
        self.assertIsNone(None)
        
        # assertIsNotNone
        self.assertIsNotNone(0)
        
        # assertIn
        self.assertIn(1, [1, 2, 3])
        
        # assertNotIn
        self.assertNotIn(4, [1, 2, 3])
        
        # assertIsInstance
        self.assertIsInstance(1, int)
        
        # assertIs
        a = [1, 2, 3]
        b = a
        self.assertIs(a, b)
        
        # assertGreater
        self.assertGreater(5, 3)
        
        # assertLess
        self.assertLess(3, 5)
        
        # assertGreaterEqual
        self.assertGreaterEqual(5, 5)
        
        # assertLessEqual
        self.assertLessEqual(5, 5)
        
        # assertAlmostEqual
        self.assertAlmostEqual(0.1 + 0.2, 0.3, places=10)
        
        # assertRaises
        with self.assertRaises(ValueError):
            raise ValueError("test")
    
    # ========== 跳过和预期失败测试 ==========
    @unittest.skip("演示跳过测试")
    def test_skipped(self):
        """演示跳过的测试"""
        self.fail("这个测试不应该执行")
    
    @unittest.skipIf(sys.version_info < (3, 6), "需要 Python 3.6+")
    def test_skip_if_condition(self):
        """演示条件跳过"""
        self.assertEqual(1, 1)
    
    @unittest.skipUnless(sys.platform.startswith('win'), "仅在 Windows 上运行")
    def test_skip_unless_condition(self):
        """演示条件执行"""
        self.assertEqual(1, 1)
    
    @unittest.expectedFailure
    def test_expected_failure(self):
        """演示预期失败的测试"""
        self.assertEqual(1, 2)  # 故意失败
    
    # ========== 子测试 ==========
    def test_subtests(self):
        """演示子测试"""
        test_cases = [
            (1, 2, 3),
            (2, 3, 5),
            (3, 4, 7),
            (4, 5, 9),
        ]
        
        with self.subTest("加法子测试"):
            for a, b, expected in test_cases:
                with self.subTest(a=a, b=b):
                    result = self.calculator.add(a, b)
                    self.assertEqual(result, expected)


# ============================================
# 测试工具类
# ============================================
class TestHelper:
    """测试辅助类"""
    
    @staticmethod
    def generate_test_data(count=10):
        """生成测试数据"""
        import random
        return [(random.randint(-100, 100), random.randint(-100, 100)) 
                for _ in range(count)]
    
    @staticmethod
    def assert_result_in_range(result, min_val, max_val):
        """断言结果在范围内"""
        assert min_val <= result <= max_val, f"结果 {result} 不在范围 [{min_val}, {max_val}] 内"


# ============================================
# 测试套件构建
# ============================================
def load_test_suite():
    """加载测试套件"""
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # 添加所有测试
    suite.addTests(loader.loadTestsFromTestCase(TestCalculator))
    
    return suite


# ============================================
# 运行测试
# ============================================
if __name__ == '__main__':
    # 方法 1: 使用 unittest 主入口
    # unittest.main(verbosity=2)
    
    # 方法 2: 使用测试套件
    suite = load_test_suite()
    runner = unittest.TextTestRunner(verbosity=2, failfast=False)
    result = runner.run(suite)
    
    # 输出测试结果摘要
    print("\n" + "="*60)
    print("测试结果摘要")
    print("="*60)
    print(f"运行测试数: {result.testsRun}")
    print(f"成功: {result.testsRun - len(result.failures) - len(result.errors)}")
    print(f"失败: {len(result.failures)}")
    print(f"错误: {len(result.errors)}")
    print(f"跳过: {len(result.skipped)}")
    print(f"预期失败: {len(result.expectedFailures)}")
    print("="*60)
    
    # 显示失败详情
    if result.failures:
        print("\n失败详情:")
        for test, traceback in result.failures:
            print(f"  - {test}: {traceback}")
    
    if result.errors:
        print("\n错误详情:")
        for test, traceback in result.errors:
            print(f"  - {test}: {traceback}")
    
    # 退出码
    sys.exit(0 if result.wasSuccessful() else 1)
