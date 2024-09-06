'use client'

import * as consts from '@/constants'

import { createWeb3Modal } from '@web3modal/wagmi/react'

import { WagmiProvider, createConfig, http } from 'wagmi'
import { coinbaseWallet, injected, safe, walletConnect } from 'wagmi/connectors'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createClient } from 'viem'
import { authConnector } from '@web3modal/wagmi'

// 0. Setup queryClient
const queryClient = new QueryClient()

// 1. Get projectId at https://cloud.walletconnect.com
const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID ?? ''

// 2. Create wagmiConfig
const metadata = {
    name: 'Peanut Protocol',
    description: 'Peanut protocol - send crypto with links',
    url: 'https://peanut.to', // origin must match your domain & subdomain
    icons: [''],
}

const config = createConfig({
    chains: consts.chains,
    connectors: [
        safe({
            allowedDomains: [/app.safe.global$/, /.*\.blockscout\.com$/],
            shimDisconnect: true,
        }),
        walletConnect({
            projectId,
            metadata,
            showQrModal: false,
        }),
        coinbaseWallet({
            appName: 'Peanut Protocol',
        }),
        injected({ shimDisconnect: true }),
        authConnector({
            chains: consts.chains,
            options: { projectId },
            email: true,
            socials: ['google', 'github', 'discord', 'x', 'apple', 'facebook'],
        }),
    ],
    client({ chain }) {
        return createClient({ chain, transport: http() })
    },
    ssr: true,
})

// 3. Create modal
createWeb3Modal({
    wagmiConfig: config,
    projectId,
    enableAnalytics: true, // Optional - defaults to your Cloud configuration
    themeVariables: {
        '--w3m-border-radius-master': '0px',
        // '--w3m-accent': 'white',
        '--w3m-color-mix': 'white',
    },
    enableOnramp: true,
})

export function ContextProvider({ children }: { children: React.ReactNode }) {
    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </WagmiProvider>
    )
}
