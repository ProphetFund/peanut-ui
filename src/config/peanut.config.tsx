'use client'
import * as config from '@/config'
import { Analytics } from '@vercel/analytics/react'
import { useEffect } from 'react'
import peanut from '@squirrel-labs/peanut-sdk'
import ReactGA from 'react-ga4'
import countries from 'i18n-iso-countries'
import enLocale from 'i18n-iso-countries/langs/en.json'

import '../../sentry.client.config'
import '../../sentry.server.config'
import '../../sentry.edge.config'
import 'react-tooltip/dist/react-tooltip.css'
import LogRocket from 'logrocket'
import { ChakraProvider } from '@chakra-ui/react'
import * as styles from '@/styles/theme'

export function PeanutProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        ReactGA.initialize(process.env.NEXT_PUBLIC_GA_KEY ?? '')
        peanut.toggleVerbose(true)
        LogRocket.init('x2zwq1/peanut-protocol')
        countries.registerLocale(enLocale)
    }, [])

    return (
        <config.ContextProvider>
            <ChakraProvider theme={styles.theme}> {children}</ChakraProvider>
            <Analytics />
        </config.ContextProvider>
    )
}
