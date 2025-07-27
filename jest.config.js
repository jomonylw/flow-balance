const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jsdom',

  // 为不同类型的测试使用不同的环境
  testEnvironmentOptions: {
    customExportConditions: [''],
  },

  // 为服务层测试使用 Node.js 环境
  projects: [
    {
      displayName: 'jsdom',
      testEnvironment: 'jsdom',
      testMatch: [
        '<rootDir>/src/components/**/__tests__/**/*.{js,jsx,ts,tsx}',
        '<rootDir>/src/components/**/*.{test,spec}.{js,jsx,ts,tsx}',
        '<rootDir>/src/hooks/**/__tests__/**/*.{js,jsx,ts,tsx}',
        '<rootDir>/src/hooks/**/*.{test,spec}.{js,jsx,ts,tsx}',
        '<rootDir>/src/contexts/**/__tests__/**/*.{js,jsx,ts,tsx}',
        '<rootDir>/src/contexts/**/*.{test,spec}.{js,jsx,ts,tsx}',
      ],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
      // 继承共享配置
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@/components/(.*)$': '<rootDir>/src/components/$1',
        '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
        '^@/types/(.*)$': '<rootDir>/src/types/$1',
        '^@/hooks/(.*)$': '<rootDir>/src/hooks/$1',
        '^@/contexts/(.*)$': '<rootDir>/src/contexts/$1',
        '^@/utils/(.*)$': '<rootDir>/src/lib/utils/$1',
        '^@/services/(.*)$': '<rootDir>/src/lib/services/$1',
        '^@/constants/(.*)$': '<rootDir>/src/lib/constants/$1',
        '^@/api/(.*)$': '<rootDir>/src/lib/api/$1',
        '^@/database/(.*)$': '<rootDir>/src/lib/database/$1',
        '^@/config/(.*)$': '<rootDir>/src/config/$1',
        '^@/ui/(.*)$': '<rootDir>/src/components/ui/$1',
        '^@/features/(.*)$': '<rootDir>/src/components/features/$1',
        // 模拟 CSS 模块
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        // 模拟静态资源
        '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
          '<rootDir>/__mocks__/fileMock.js',
      },
      transform: {
        '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
      },
    },
    {
      displayName: 'node',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/src/lib/**/__tests__/**/*.{js,jsx,ts,tsx}',
        '<rootDir>/src/lib/**/*.{test,spec}.{js,jsx,ts,tsx}',
        '<rootDir>/src/app/api/**/__tests__/**/*.{js,jsx,ts,tsx}',
        '<rootDir>/src/app/api/**/*.{test,spec}.{js,jsx,ts,tsx}',
      ],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.node.js'],
      // 为 Node.js 测试设置环境变量
      testEnvironmentOptions: {
        NODE_ENV: 'test',
        DATABASE_URL: 'file:./test.db',
        JWT_SECRET: 'test-jwt-secret',
        NEXTAUTH_SECRET: 'test-nextauth-secret',
        NEXTAUTH_URL: 'http://localhost:3000',
      },
      // 继承共享配置
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@/components/(.*)$': '<rootDir>/src/components/$1',
        '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
        '^@/types/(.*)$': '<rootDir>/src/types/$1',
        '^@/hooks/(.*)$': '<rootDir>/src/hooks/$1',
        '^@/contexts/(.*)$': '<rootDir>/src/contexts/$1',
        '^@/utils/(.*)$': '<rootDir>/src/lib/utils/$1',
        '^@/services/(.*)$': '<rootDir>/src/lib/services/$1',
        '^@/constants/(.*)$': '<rootDir>/src/lib/constants/$1',
        '^@/api/(.*)$': '<rootDir>/src/lib/api/$1',
        '^@/database/(.*)$': '<rootDir>/src/lib/database/$1',
        '^@/config/(.*)$': '<rootDir>/src/config/$1',
        '^@/ui/(.*)$': '<rootDir>/src/components/ui/$1',
        '^@/features/(.*)$': '<rootDir>/src/components/features/$1',
      },
      transform: {
        '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
      },
    },
  ],

  // 共享配置
  // 模块路径映射
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@/types/(.*)$': '<rootDir>/src/types/$1',
    '^@/hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@/contexts/(.*)$': '<rootDir>/src/contexts/$1',
    '^@/utils/(.*)$': '<rootDir>/src/lib/utils/$1',
    '^@/services/(.*)$': '<rootDir>/src/lib/services/$1',
    '^@/constants/(.*)$': '<rootDir>/src/lib/constants/$1',
    '^@/api/(.*)$': '<rootDir>/src/lib/api/$1',
    '^@/database/(.*)$': '<rootDir>/src/lib/database/$1',
    '^@/config/(.*)$': '<rootDir>/src/config/$1',
    '^@/ui/(.*)$': '<rootDir>/src/components/ui/$1',
    '^@/features/(.*)$': '<rootDir>/src/components/features/$1',
    // 模拟 CSS 模块
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    // 模拟静态资源
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/__mocks__/fileMock.js',
  },

  // 测试文件匹配模式（由 projects 配置覆盖）

  // 覆盖率配置
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/index.{js,jsx,ts,tsx}',
    '!src/app/**', // 排除 Next.js 路由文件
  ],

  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
  },

  // 忽略的文件和目录
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/out/',
    '<rootDir>/build/',
  ],

  // 模块路径忽略模式
  modulePathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/out/',
    '<rootDir>/build/',
  ],

  // 测试环境变量
  setupFiles: ['<rootDir>/jest.env.js'],

  // 转换配置
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },

  // 全局设置
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
    },
  },
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
