declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      id: string
      isAdmin: boolean
      username?: string
    }
    isApiToken?: boolean
  }
}

export {}
