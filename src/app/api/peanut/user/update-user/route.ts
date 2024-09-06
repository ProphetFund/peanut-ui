import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import * as consts from '@/constants'

export async function POST(request: NextRequest) {
    const { userId, username, bridge_customer_id } = await request.json()
    const apiKey = process.env.PEANUT_API_KEY
    const cookieStore = cookies()
    const token = cookieStore.get('jwt-token')

    if (!userId || !apiKey || !token) {
        return new NextResponse('Bad Request: missing required parameters', { status: 400 })
    }

    try {
        const response = await fetch(`${consts.PEANUT_API_URL}/update-user`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token.value}`,
                'api-key': apiKey,
            },
            body: JSON.stringify({
                userId,
                username,
                bridge_customer_id,
            }),
        })

        if (response.status === 404) {
            return new NextResponse('Not Found', {
                status: 404,
                headers: {
                    'Content-Type': 'application/json',
                },
            })
        }

        const data = await response.json()

        if (response.status === 409) {
            return new NextResponse(JSON.stringify(data.message), {
                status: 409,
                headers: {
                    'Content-Type': 'application/json',
                },
            })
        }

        if (response.status !== 200) {
            return new NextResponse(JSON.stringify(data), {
                status: response.status,
                headers: {
                    'Content-Type': 'application/json',
                },
            })
        }

        return new NextResponse(JSON.stringify(data), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
            },
        })
    } catch (error) {
        console.error('Error:', error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}
