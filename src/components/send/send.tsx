'use client'
import { createElement, useEffect, useState } from 'react'
import * as global_components from '@/components/global'
import * as _consts from './send.consts'
import { useW3iAccount } from '@web3inbox/widget-react'
import { useAccount } from 'wagmi'

export function Send({ type }: { type: 'normal' | 'red-packet' }) {
    const [sendScreen, setSendScreen] = useState<_consts.ISendScreenState>(_consts.INIT_VIEW)
    const [claimLink, setClaimLink] = useState<string | string[]>('')
    const [txHash, setTxHash] = useState<string>('')
    const [chainId, setChainId] = useState<string>('1')
    const { setAccount } = useW3iAccount()
    const { address } = useAccount({
        onDisconnect: () => {
            setAccount('')
        },
    })

    useEffect(() => {
        if (!Boolean(address)) return
        setAccount(`eip155:1:${address}`)
    }, [address, setAccount])

    const handleOnNext = () => {
        const newIdx = sendScreen.idx + 1
        setSendScreen(() => ({
            screen: _consts.SEND_SCREEN_FLOW[newIdx],
            idx: newIdx,
        }))
    }

    const handleOnCustom = (screen: _consts.SendScreens) => {
        setSendScreen(() => ({
            screen: screen,
            idx: _consts.SEND_SCREEN_FLOW.indexOf(screen),
        }))
    }

    return (
        <>
            {type == 'normal' && (
                <global_components.CardWrapper mt=" mt-16 " shadow>
                    {createElement(_consts.SEND_SCREEN_MAP[sendScreen.screen].comp, {
                        onNextScreen: handleOnNext,
                        onCustomScreen: handleOnCustom,
                        claimLink,
                        setClaimLink,
                        txHash,
                        setTxHash,
                        chainId,
                        setChainId,
                    } as _consts.ISendScreenProps)}
                </global_components.CardWrapper>
            )}
            {type == 'red-packet' && (
                <global_components.CardWrapper mt=" mt-16 " shadow redPacket>
                    {createElement(_consts.RED_PACKET_SEND_SCREEN_MAP[sendScreen.screen].comp, {
                        onNextScreen: handleOnNext,
                        onCustomScreen: handleOnCustom,
                        claimLink,
                        setClaimLink,
                        txHash,
                        setTxHash,
                        chainId,
                        setChainId,
                    } as _consts.ISendScreenProps)}
                </global_components.CardWrapper>
            )}
        </>
    )
}
