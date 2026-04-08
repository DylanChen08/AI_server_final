#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
测试示例文件
包含基本的单元测试用例
"""

import unittest


# 被测试的函数
def add(a, b):
    """加法函数"""
    return a + b


def divide(a, b):
    """除法函数"""
    if b == 0:
        raise ValueError("除数不能为零")
    return a / b


def is_even(n):
    """判断是否为偶数"""
    return n % 2 == 0


# 测试类
class TestMathFunctions(unittest.TestCase):
    """数学函数测试类"""

    def test_add_positive_numbers(self):
        """测试正数相加"""
        self.assertEqual(add(2, 3), 5)
        self.assertEqual(add(10, 20), 30)

    def test_add_negative_numbers(self):
        """测试负数相加"""
        self.assertEqual(add(-2, -3), -5)
        self.assertEqual(add(-10, 20), 10)

    def test_add_zero(self):
        """测试与零相加"""
        self.assertEqual(add(0, 5), 5)
        self.assertEqual(add(5, 0), 5)

    def test_divide_normal(self):
        """测试正常除法"""
        self.assertEqual(divide(10, 2), 5)
        self.assertEqual(divide(9, 3), 3)

    def test_divide_by_zero(self):
        """测试除以零异常"""
        with self.assertRaises(ValueError):
            divide(10, 0)

    def test_is_even(self):
        """测试偶数判断"""
        self.assertTrue(is_even(2))
        self.assertTrue(is_even(0))
        self.assertFalse(is_even(3))
        self.assertFalse(is_even(-1))


class TestEdgeCases(unittest.TestCase):
    """边界条件测试类"""

    def test_large_numbers(self):
        """测试大数"""
        self.assertEqual(add(1000000, 2000000), 3000000)

    def test_float_numbers(self):
        """测试浮点数"""
        result = add(1.5, 2.5)
        self.assertAlmostEqual(result, 4.0, places=2)


# 运行测试
if __name__ == '__main__':
    unittest.main(verbosity=2)
