'use client'

import Header from '@/components/Global/Header'
import Footer from '@/components/Global/Footer'
import { useState, useEffect } from 'react'
import { Roboto_Flex } from 'next/font/google'
import * as utils from '@/utils'
import Modal from '../Modal'
import { Widget } from '@typeform/embed-react'
import { set } from 'react-hook-form'
import { useWalletType } from '@/hooks/useWalletType'
import { default as NextImage } from 'next/image'
import * as assets from '@/assets'
import { MarqueeWrapper } from '../MarqueeWrapper'
type LayoutProps = {
    children: React.ReactNode
    className?: string
}

const roboto = Roboto_Flex({
    weight: ['400', '500', '700', '800'],
    subsets: ['latin'],
    display: 'block',
    variable: '--font-roboto',
})

const Layout = ({ children, className }: LayoutProps) => {
    const [isReady, setIsReady] = useState(false)
    const [loaded, setLoaded] = useState(false)
    const [showModal, setShowModal] = useState(false)

    useEffect(() => {
        setIsReady(true)
    }, [])

    return (
        isReady && (
            <>
                <style jsx global>{`
                    html {
                        font-family: ${roboto.style.fontFamily};
                    }
                `}</style>
                <div className="relative">
                    <div className="flex min-h-screen flex-col ">
                        <Header />
                        <MarqueeWrapper
                            backgroundColor="bg-purple-1"
                            onClick={() => {
                                setShowModal(true)
                            }}
                        >
                            <p className="px-4 py-2 text-h4 text-white">Sign up and get rewards!</p>
                            <img src={assets.SMILEY_ICON.src} className="h-6 w-6 fill-white" />
                        </MarqueeWrapper>
                        <div className="flex grow justify-center">
                            <div
                                className={`4xl:max-w-full flex grow flex-col justify-center pb-2 pt-6 sm:mx-auto sm:px-16 md:px-5 lg:px-6 2xl:px-8 ${className}`}
                                style={{ flexGrow: 1 }}
                            >
                                {children}
                            </div>
                        </div>
                        <Footer />
                        <div className="pointer-events-none absolute inset-0 -z-1 overflow-hidden dark:opacity-70">
                            <div className="absolute inset-0 z-1 bg-n-1 opacity-0 dark:opacity-80"></div>
                            <div className="absolute -right-72 top-2/3 w-[75rem] -translate-y-1/2  2xl:w-[95rem]">
                                <NextImage
                                    className={`inline-block w-full align-top opacity-0 transition-opacity ${
                                        loaded ? 'opacity-100' : ''
                                    } ${className}`}
                                    onLoadingComplete={() => setLoaded(true)}
                                    src={assets.BG_SVG.src}
                                    width={1349}
                                    height={1216}
                                    alt=""
                                />
                            </div>
                            <div className="absolute -left-52 top-1/4 w-[55rem] -translate-y-1/2 2xl:w-[75rem]">
                                <NextImage
                                    className={`inline-block w-full align-top opacity-0 transition-opacity ${
                                        loaded ? 'opacity-100' : ''
                                    } ${className}`}
                                    onLoadingComplete={() => setLoaded(true)}
                                    src={assets.BG_SVG.src}
                                    width={1349}
                                    height={1216}
                                    alt=""
                                    style={{ transform: 'scale(-1, -1)' }}
                                />
                            </div>
                        </div>
                        <Modal
                            visible={showModal}
                            onClose={() => {
                                setShowModal(false)
                            }}
                            classNameWrapperDiv="px-5 pb-7 pt-8"
                            classButtonClose="hidden"
                            className="z-50"
                        >
                            {/* <div className="flex h-full w-full flex-col items-center justify-center gap-4 text-center">
                                <label className="text-h6">
                                    Welcome to the closed alpha. If you have an access code, input in into the form
                                    below and click submit. If not, reach out to us and we might give you one :){' '}
                                </label>
                                <input
                                    className={`w-full border border-n-1 px-4 py-2 focus:outline-none ${accessCode.length > 0 && !validAccessCode ? 'border-red' : ''}`}
                                    value={accessCode}
                                    onChange={(e) => {
                                        setAccessCode(e.target.value)
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleSubmit()
                                        }
                                    }}
                                />

                                <button className="btn-purple btn-xl" onClick={handleSubmit}>
                                    submit
                                </button>
                            </div> */}

                            <Widget
                                id="lTEp058W"
                                style={{ width: '100%', height: '400px' }}
                                className="center-xy items-center self-center"
                                onSubmit={() => {
                                    setShowModal(false)
                                }}
                            />
                        </Modal>{' '}
                    </div>
                </div>
            </>
        )
    )
}

export default Layout
