import type { FastifySchema } from "fastify"

export const LOGIN_SCHEMA: FastifySchema = {
  description: "Authenticating a user, taking a email and password",
  tags: ["Auth"],
  summary:
    "Authenticating a user, taking an email and password and returning a JWT Access and Refresh Token",
  body: {
    type: "object",
    required: ["email", "password"],
    properties: {
      email: { type: "string" },
      password: { type: "string" }
    }
  },
  response: {
    200: {
      type: "object",
      description: "Successfuly Logged In",
      properties: {
        accessToken: { type: "string" },
        refreshToken: { type: "string" },
        handle: { type: "string" }
      }
    },
    400: {
      type: "object",
      description: "User got an email or password wrong",
      properties: {
        email: { type: "string" },
        password: { type: "string" }
      }
    },
    401: {
      type: "object",
      description: "User is not verified",
      properties: {
        error: { type: "string" }
      }
    }
  }
}

export const REGISTER_SCHEMA: FastifySchema = {
  description: "Registering a user, taking a email, username and password",
  tags: ["Auth"],
  summary: "Registering a user, taking a email, username and password",
  body: {
    type: "object",
    required: ["email", "username", "password"],
    properties: {
      email: { type: "string" },
      username: { type: "string" },
      password: { type: "string" }
    }
  },
  response: {
    201: {
      type: "object",
      description: "Successfuly Registered",
      properties: {
        email: { type: "string" },
        username: { type: "string" }
      }
    },
    400: {
      type: "object",
      description: "Email or Username is already in use",
      properties: {
        error: { type: "string" }
      }
    },
    500: {
      type: "object",
      description: "Server error",
      properties: {
        error: { type: "string" }
      }
    }
  }
}

export const LOGOUT_SCHEMA: FastifySchema = {
  description: "Log out a user, clearing the JWT Access and Refresh Tokens",
  tags: ["Auth"],
  summary: "Log out a user by clearing cookies",
  response: {
    200: {
      type: "object",
      description: "Successfully Logged Out",
      properties: {
        message: { type: "string" }
      }
    }
  }
}

export const FORGOT_PASSWORD_SCHEMA: FastifySchema = {
  description: "Initiate password reset process",
  tags: ["Auth"],
  summary: "Send user an email with a link to reset their password",
  body: {
    type: "object",
    required: ["email"],
    properties: {
      email: { type: "string" }
    }
  },
  response: {
    200: {
      type: "object",
      description: "Password reset email sent",
      properties: {
        message: { type: "string" }
      }
    }
  }
}

export const CHANGE_PASSWORD_SCHEMA: FastifySchema = {
  description: "Change user's password",
  tags: ["Auth"],
  summary: "Allows a user to change their password",
  body: {
    type: "object",
    required: ["newPassword", "userId"],
    properties: {
      newPassword: { type: "string" },
      userId: { type: "string" }
    }
  },
  response: {
    200: {
      type: "object",
      description: "Password successfully changed",
      properties: {
        message: { type: "string" }
      }
    }
  }
}

export const REFRESH_TOKEN_SCHEMA: FastifySchema = {
  description: "Refresh JWT Access Token using Refresh Token",
  tags: ["Auth"],
  summary: "Refresh access token",
  response: {
    200: {
      type: "object",
      description: "Access Token Refreshed",
      properties: {
        accessToken: { type: "string" }
      }
    },
    401: {
      type: "object",
      description: "Unauthorized",
      properties: {
        error: { type: "string" }
      }
    }
  }
}

export const WHOAMI_SCHEMA: FastifySchema = {
  description: "Returns user information for the currently authenticated user",
  tags: ["Auth"],
  summary: "Get current user's information",
  response: {
    200: {
      type: "object",
      description: "User Information",
      properties: {
        user: {
          type: "object",
          properties: {
            // Define user object properties here based on your User model
          }
        }
      }
    },
    401: {
      type: "object",
      description: "Unauthorized",
      properties: {
        error: { type: "string" }
      }
    }
  }
}

export const VERIFY_SCHEMA: FastifySchema = {
  description: "Verify user's email",
  tags: ["Auth"],
  summary: "Verify user's email through UUID link",
  params: {
    type: "object",
    required: ["uuid"],
    properties: {
      uuid: { type: "string" }
    }
  },
  response: {
    200: {
      type: "object",
      description: "User Verified",
      properties: {
        message: { type: "string" }
      }
    },
    400: {
      type: "object",
      description: "Invalid UUID",
      properties: {
        error: { type: "string" }
      }
    },
    404: {
      type: "object",
      description: "User not found",
      properties: {
        error: { type: "string" }
      }
    }
  }
}
