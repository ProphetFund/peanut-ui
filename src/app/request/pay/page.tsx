import { Metadata } from 'next'
import Layout from '@/components/Global/Layout'
import * as components from '@/components'

export const metadata: Metadata = {
    title: 'Peanut Protocol',
    description: 'Text Tokens',
    metadataBase: new URL('https://peanut.to'),
    icons: {
        icon: '/logo-favicon.png',
    },
    openGraph: {
        images: [
            {
                url: '/metadata-img.png',
            },
        ],
    },
}
export default function RequestPay() {
    return (
        <Layout className="!mx-0 w-full !px-0 !pt-0 ">
            <components.PayRequestLink />
        </Layout>
    )
}
