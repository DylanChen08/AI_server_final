#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
单元测试文件示例
包含测试用例、断言和测试数据，覆盖主要功能场景
"""

import unittest
from unittest.mock import Mock, patch
import sys
import os

# 添加项目根目录到路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class TestCalculator(unittest.TestCase):
    """计算器功能测试类"""
    
    # 测试数据
    TEST_DATA_ADD = [
        (1, 2, 3),
        (0, 0, 0),
        (-1, -1, -2),
        (100, 200, 300),
        (1.5, 2.5, 4.0),
    ]
    
    TEST_DATA_DIVIDE = [
        (10, 2, 5),
        (100, 10, 10),
        (7, 2, 3.5),
    ]
    
    def setUp(self):
        """每个测试方法执行前的准备工作"""
        self.calculator = Calculator()
        print("\n=== 开始测试 ===")
    
    def tearDown(self):
        """每个测试方法执行后的清理工作"""
        del self.calculator
        print("=== 测试结束 ===")
    
    def test_add_positive_numbers(self):
        """测试正数相加"""
        result = self.calculator.add(5, 3)
        self.assertEqual(result, 8)
        self.assertIsInstance(result, (int, float))
    
    def test_add_negative_numbers(self):
        """测试负数相加"""
        result = self.calculator.add(-5, -3)
        self.assertEqual(result, -8)
    
    def test_add_mixed_numbers(self):
        """测试混合数字相加"""
        result = self.calculator.add(-5, 3)
        self.assertEqual(result, -2)
    
    def test_add_with_test_data(self):
        """使用测试数据测试加法"""
        for a, b, expected in self.TEST_DATA_ADD:
            with self.subTest(a=a, b=b):
                result = self.calculator.add(a, b)
                self.assertEqual(result, expected)
    
    def test_subtract(self):
        """测试减法"""
        result = self.calculator.subtract(10, 4)
        self.assertEqual(result, 6)
        self.assertGreater(result, 0)
    
    def test_multiply(self):
        """测试乘法"""
        result = self.calculator.multiply(3, 4)
        self.assertEqual(result, 12)
        self.assertLessEqual(result, 100)
    
    def test_divide(self):
        """测试除法"""
        result = self.calculator.divide(10, 2)
        self.assertEqual(result, 5)
        self.assertNotEqual(result, 0)
    
    def test_divide_by_zero(self):
        """测试除以零的异常处理"""
        with self.assertRaises(ZeroDivisionError):
            self.calculator.divide(10, 0)
    
    def test_divide_with_test_data(self):
        """使用测试数据测试除法"""
        for a, b, expected in self.TEST_DATA_DIVIDE:
            with self.subTest(a=a, b=b):
                result = self.calculator.divide(a, b)
                self.assertAlmostEqual(result, expected, places=2)


class TestUserService(unittest.TestCase):
    """用户服务功能测试类"""
    
    # 测试数据
    VALID_USERS = [
        {"id": 1, "name": "张三", "email": "zhangsan@example.com"},
        {"id": 2, "name": "李四", "email": "lisi@example.com"},
        {"id": 3, "name": "王五", "email": "wangwu@example.com"},
    ]
    
    INVALID_EMAILS = [
        "invalid",
        "@example.com",
        "user@",
        "user@.com",
    ]
    
    def setUp(self):
        """初始化测试环境"""
        self.user_service = UserService()
        self.mock_db = Mock()
    
    def test_create_user(self):
        """测试创建用户"""
        user_data = {"name": "测试用户", "email": "test@example.com"}
        result = self.user_service.create_user(user_data)
        
        self.assertIsNotNone(result)
        self.assertTrue(hasattr(result, 'id'))
        self.assertEqual(result.name, user_data['name'])
    
    def test_get_user_by_id(self):
        """测试根据ID获取用户"""
        user_id = 1
        result = self.user_service.get_user_by_id(user_id)
        
        self.assertIsNotNone(result)
        self.assertEqual(result.id, user_id)
    
    def test_get_user_not_found(self):
        """测试获取不存在的用户"""
        result = self.user_service.get_user_by_id(99999)
        
        self.assertIsNone(result)
    
    def test_update_user(self):
        """测试更新用户信息"""
        user_id = 1
        update_data = {"name": "新名字"}
        result = self.user_service.update_user(user_id, update_data)
        
        self.assertTrue(result)
        self.assertEqual(result.name, update_data['name'])
    
    def test_delete_user(self):
        """测试删除用户"""
        user_id = 1
        result = self.user_service.delete_user(user_id)
        
        self.assertTrue(result)
    
    def test_validate_email(self):
        """测试邮箱验证"""
        valid_email = "test@example.com"
        result = self.user_service.validate_email(valid_email)
        
        self.assertTrue(result)
    
    def test_validate_email_invalid(self):
        """测试无效邮箱验证"""
        for invalid_email in self.INVALID_EMAILS:
            with self.subTest(email=invalid_email):
                result = self.user_service.validate_email(invalid_email)
                self.assertFalse(result)
    
    def test_get_all_users(self):
        """测试获取所有用户"""
        users = self.user_service.get_all_users()
        
        self.assertIsInstance(users, list)
        self.assertGreaterEqual(len(users), 0)
    
    @patch('UserService.database_query')
    def test_create_user_with_mock(self, mock_db_query):
        """使用 Mock 测试创建用户"""
        mock_db_query.return_value = {"id": 1, "name": "Mock User"}
        
        result = self.user_service.create_user({"name": "Mock User"})
        
        mock_db_query.assert_called_once()
        self.assertIsNotNone(result)


class TestEdgeCases(unittest.TestCase):
    """边界条件测试类"""
    
    def test_empty_input(self):
        """测试空输入"""
        result = process_data("")
        self.assertEqual(result, [])
    
    def test_none_input(self):
        """测试 None 输入"""
        with self.assertRaises(TypeError):
            process_data(None)
    
    def test_large_input(self):
        """测试大输入"""
        large_data = "a" * 10000
        result = process_data(large_data)
        self.assertGreater(len(result), 0)
    
    def test_special_characters(self):
        """测试特殊字符"""
        special_data = "!@#$%^&*()"
        result = process_data(special_data)
        self.assertIsInstance(result, list)
    
    def test_unicode_characters(self):
        """测试 Unicode 字符"""
        unicode_data = "你好世界🌍"
        result = process_data(unicode_data)
        self.assertGreater(len(result), 0)


class TestPerformance(unittest.TestCase):
    """性能测试类"""
    
    def test_response_time(self):
        """测试响应时间"""
        import time
        
        start_time = time.time()
        result = self.user_service.get_all_users()
        end_time = time.time()
        
        elapsed_time = end_time - start_time
        self.assertLess(elapsed_time, 1.0)  # 响应时间应小于1秒
    
    def test_memory_usage(self):
        """测试内存使用"""
        import tracemalloc
        
        tracemalloc.start()
        
        users = self.user_service.get_all_users()
        
        current, peak = tracemalloc.get_traced_memory()
        tracemalloc.stop()
        
        self.assertLess(peak, 10 * 1024 * 1024)  # 峰值内存应小于10MB


# 辅助函数（模拟被测试的模块）
class Calculator:
    def add(self, a, b):
        return a + b
    
    def subtract(self, a, b):
        return a - b
    
    def multiply(self, a, b):
        return a * b
    
    def divide(self, a, b):
        if b == 0:
            raise ZeroDivisionError("除数不能为零")
        return a / b


class UserService:
    def __init__(self):
        self.users = [
            {"id": 1, "name": "张三", "email": "zhangsan@example.com"},
            {"id": 2, "name": "李四", "email": "lisi@example.com"},
        ]
    
    def create_user(self, user_data):
        return Mock(id=1, **user_data)
    
    def get_user_by_id(self, user_id):
        for user in self.users:
            if user["id"] == user_id:
                return Mock(**user)
        return None
    
    def update_user(self, user_id, update_data):
        return Mock(id=user_id, **update_data)
    
    def delete_user(self, user_id):
        return True
    
    def validate_email(self, email):
        return "@" in email and "." in email
    
    def get_all_users(self):
        return [Mock(**user) for user in self.users]
    
    @staticmethod
    def database_query():
        pass


def process_data(data):
    """数据处理辅助函数"""
    if data is None:
        raise TypeError("输入不能为 None")
    if not data:
        return []
    return list(data)


# 运行测试
if __name__ == "__main__":
    # 创建测试套件
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # 添加测试类
    suite.addTests(loader.loadTestsFromTestCase(TestCalculator))
    suite.addTests(loader.loadTestsFromTestCase(TestUserService))
    suite.addTests(loader.loadTestsFromTestCase(TestEdgeCases))
    suite.addTests(loader.loadTestsFromTestCase(TestPerformance))
    
    # 运行测试
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # 输出测试报告
    print("\n" + "=" * 50)
    print("测试报告")
    print("=" * 50)
    print(f"运行测试数: {result.testsRun}")
    print(f"成功: {result.testsRun - len(result.failures) - len(result.errors)}")
    print(f"失败: {len(result.failures)}")
    print(f"错误: {len(result.errors)}")
    print("=" * 50)
