export default {
    '/email': {
        get: {
            tags: ['auth'],
            summary: '이메일 전송',
            description: '이메일 전송',
            security: [
                {
                    bearerAuth: [],
                },
            ],
            responses: {
                200: {
                    description: '이메일 전송 성공',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: {
                                        type: 'boolean',
                                        description: '성공여부',
                                        example: true,
                                    },
                                },
                            },
                        },
                    },
                },
                401: {
                    description: '이메일 전송 실패',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: {
                                        type: 'boolean',
                                        description: '성공여부',
                                        example: false,
                                    },
                                    error: {
                                        type: 'object',
                                        description: '에러',
                                        example: {
                                            message: 'User not found',
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },
};
