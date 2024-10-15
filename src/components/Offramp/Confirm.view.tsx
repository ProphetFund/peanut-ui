'use client'
import { useContext, useState, useCallback } from 'react'
import * as context from '@/context'
import Loading from '@/components/Global/Loading'
import Icon from '@/components/Global/Icon'
import { useAuth } from '@/context/authContext'
import MoreInfo from '@/components/Global/MoreInfo'
import * as utils from '@/utils'
import { useCreateLink } from '@/components/Create/useCreateLink'
import { useSteps } from 'chakra-ui-steps'
import peanut, { getLatestContractVersion, getLinkDetails } from '@squirrel-labs/peanut-sdk'
import { sortCrossChainDetails } from '@/components/Claim/Claim.utils'
import * as consts from '@/constants'
import { GlobalKYCComponent } from '@/components/Global/KYCComponent'
import { GlobaLinkAccountComponent } from '@/components/Global/LinkAccountComponent'
import useClaimLink from '@/components/Claim/useClaimLink'
import Link from 'next/link'
import { CrispButton } from '@/components/CrispChat'
import {
    achFeeExplainer,
    claimLinkFeeExplainer,
    CrossChainDetails,
    IOfframpConfirmScreenProps,
    LiquidationAddress,
    OFFRAMP_IBAN_FEE_USD,
    OFFRAMP_NON_IBAN_FEE_USD,
    OfframpType,
    optimismChainId,
    PeanutAccount,
    sepaFeeExplainer,
    usdcAddressOptimism,
} from '@/components/Offramp/Offramp.consts'
import { FAQComponent } from '../Cashout/Components/Faq.comp'

export const OfframpConfirmView = ({
    onNext, // available on all offramps
    onPrev, // available on all offramps
    initialKYCStep, // available on all offramps
    offrampForm, // available on all offramps
    setOfframpForm, // available on all offramps
    offrampType, // available on all offramps
    setTransactionHash, // available on all offramps

    usdValue, // available on cashouts
    tokenValue, // available on cashouts
    preparedCreateLinkWrapperResponse, // available on cashouts

    claimLinkData, // available on link claim offramps
    recipientType, // available on link claim offramps
    tokenPrice, // available on link claim offramps
    attachment, // available on link claim offramps
    estimatedPoints, // available on link claim offramps
    crossChainDetails, // available on link claim offramps
}: IOfframpConfirmScreenProps) => {
    //////////////////////
    // state and context vars w/ shared functionality across all offramp types

    const [errorState, setErrorState] = useState<{
        showError: boolean
        errorMessage: string
    }>({ showError: false, errorMessage: '' })
    const { setLoadingState, loadingState, isLoading } = useContext(context.loadingStateContext)
    const { claimLink, claimLinkXchain } = useClaimLink()
    const { fetchUser, user } = useAuth()

    //////////////////////
    // state and context vars for cashout offramp
    const { selectedChainID, selectedTokenAddress } = useContext(context.tokenSelectorContext)
    const [showRefund, setShowRefund] = useState(false)
    const { createLinkWrapper } = useCreateLink()
    const [createdLink, setCreatedLink] = useState<string | undefined>(undefined)

    //////////////////////
    // state and context vars for claim link offramp

    //////////////////////
    // utility JSX vars

    // type: 'iban' or other
    // TODO: standardize this type
    let accountType = user?.accounts.find((account) => account.account_identifier === offrampForm.recipient)?.account_type

    let fee  = 0;

    let feeExplainer = ''
    if (offrampType == OfframpType.CASHOUT) {
        fee = accountType === 'iban' ? OFFRAMP_IBAN_FEE_USD : OFFRAMP_NON_IBAN_FEE_USD
        feeExplainer = accountType === 'iban' ? sepaFeeExplainer + ' ' + achFeeExplainer: achFeeExplainer + ' ' + sepaFeeExplainer
    } else {
        // other types of offramp (eg. CLAIM link) do not have a fee
        if (offrampType == OfframpType.CLAIM) {
            feeExplainer = claimLinkFeeExplainer
        }
    }

    let amount: number = 0

    if (offrampType == OfframpType.CASHOUT) {
        if (accountType == 'iban') {
            amount = parseFloat(usdValue ?? tokenValue ?? '') - fee
        } else {
            amount = parseFloat(usdValue ?? '') - fee
        }
    } else if (offrampType == OfframpType.CLAIM && tokenPrice && claimLinkData) {
        amount = tokenPrice * parseFloat(claimLinkData.tokenAmount) - fee
    }

    const amountReceived = utils.formatTokenAmount(amount)

    //////////////////////
    // functions w/ shared functionality across all offramp types
    const { setStep: setActiveStep, activeStep } = useSteps({
        initialStep: initialKYCStep,
    })

    const handleCompleteKYC = (message: string) => {
        if (message === 'account found') {
            setActiveStep(4)
        } else if (message === 'KYC completed') {
            setActiveStep(3)
        }
    }

    const handleCompleteLinkAccount = (message: string) => {
        if (message === 'success') {
            setActiveStep(4)
        }
    }

    //////////////////////
    // functions for cashout offramps
    // TODO: they need to be refactored to a separate file

    const fetchNecessaryDetails = useCallback(async () => {
        if (!user || !selectedChainID || !selectedTokenAddress) {
            throw new Error('Missing user or token information')
        }

        const tokenType = utils.isNativeCurrency(selectedTokenAddress) ? 0 : 1
        const contractVersion = await getLatestContractVersion({
            chainId: selectedChainID,
            type: 'normal',
            experimental: false,
        })

        const crossChainDetails = await getCrossChainDetails({
            chainId: selectedChainID,
            tokenType,
            contractVersion,
        })

        // Find the user's Peanut account that matches the offramp form recipient
        const peanutAccount = user.accounts.find(
            (account) =>
                account.account_identifier?.toLowerCase().replaceAll(' ', '') ===
                offrampForm?.recipient?.toLowerCase().replaceAll(' ', '')
        )
        const bridgeCustomerId = user?.user?.bridge_customer_id
        const bridgeExternalAccountId = peanutAccount?.bridge_account_id

        if (!peanutAccount || !bridgeCustomerId || !bridgeExternalAccountId) {
            throw new Error('Missing account information')
        }

        // Fetch all liquidation addresses for the user
        const allLiquidationAddresses = await utils.getLiquidationAddresses(bridgeCustomerId)

        return {
            crossChainDetails,
            peanutAccount,
            bridgeCustomerId,
            bridgeExternalAccountId,
            allLiquidationAddresses,
        }
    }, [user, selectedChainID, selectedTokenAddress, offrampForm])

    const handleConfirm = async () => {
        setLoadingState('Loading')
        setErrorState({ showError: false, errorMessage: '' })

        try {
            if (!preparedCreateLinkWrapperResponse) return

            // Fetch all necessary details before creating the link
            // (and make sure we have all the data we need)
            const {
                crossChainDetails,
                peanutAccount,
                bridgeCustomerId,
                bridgeExternalAccountId,
                allLiquidationAddresses,
            } = await fetchNecessaryDetails()

            const link = await createLinkWrapper(preparedCreateLinkWrapperResponse)
            setCreatedLink(link)
            console.log(`created claimlink: ${link}`)

            // Save link temporarily in localStorage with TEMP tag
            const tempKey = `TEMP_CASHOUT_LINK_${Date.now()}`
            localStorage.setItem(
                tempKey,
                JSON.stringify({
                    link,
                    createdAt: Date.now(),
                })
            )
            console.log(`Temporarily saved link in localStorage with key: ${tempKey}`)

            const claimLinkData = await getLinkDetails({ link: link })

            // Process link details and determine if cross-chain transfer is needed
            const { tokenName, chainName, xchainNeeded, liquidationAddress } = await processLinkDetails(
                claimLinkData,
                crossChainDetails as CrossChainDetails[],
                allLiquidationAddresses,
                bridgeCustomerId,
                bridgeExternalAccountId,
                peanutAccount.account_type
            )

            if (!tokenName || !chainName) {
                throw new Error('Unable to determine token or chain information')
            }

            // get chainId and tokenAddress (default to optimism)
            const chainId = utils.getChainIdFromBridgeChainName(chainName) ?? ''
            const tokenAddress = utils.getTokenAddressFromBridgeTokenName(chainId ?? '10', tokenName) ?? ''

            const hash = await claimAndProcessLink(
                xchainNeeded,
                liquidationAddress.address,
                claimLinkData,
                chainId,
                tokenAddress
            )

            localStorage.removeItem(tempKey)
            console.log(`Removed temporary link from localStorage: ${tempKey}`)

            await saveAndSubmitCashoutLink(
                claimLinkData,
                hash,
                liquidationAddress,
                bridgeCustomerId,
                bridgeExternalAccountId,
                chainId,
                tokenName,
                peanutAccount
            )

            setTransactionHash(hash)
            console.log('Transaction hash:', hash)

            onNext()
            setLoadingState('Idle')
        } catch (error) {
            handleError(error)
        } finally {
            setLoadingState('Idle')
        }
    }

    const processLinkDetails = async (
        claimLinkData: any, // TODO: fix type
        crossChainDetails: CrossChainDetails[],
        allLiquidationAddresses: LiquidationAddress[],
        bridgeCustomerId: string,
        bridgeExternalAccountId: string,
        accountType: string
    ) => {
        let tokenName = utils.getBridgeTokenName(claimLinkData.chainId, claimLinkData.tokenAddress)
        let chainName = utils.getBridgeChainName(claimLinkData.chainId)
        let xchainNeeded = false

        // if we don't have a token and chain name (meaning bridge supports it), we do x-chain transfer to optimism usdc
        if (!tokenName || !chainName) {
            xchainNeeded = true
            const { tokenName: xchainTokenName, chainName: xchainChainName } = await handleCrossChainScenario(
                claimLinkData,
                crossChainDetails
            )
            tokenName = xchainTokenName
            chainName = xchainChainName
        }

        let liquidationAddress = allLiquidationAddresses.find(
            (address) =>
                address.chain === chainName &&
                address.currency === tokenName &&
                address.external_account_id === bridgeExternalAccountId
        )

        if (!liquidationAddress) {
            liquidationAddress = await utils.createLiquidationAddress(
                bridgeCustomerId,
                chainName as string,
                tokenName as string,
                bridgeExternalAccountId,
                accountType === 'iban' ? 'sepa' : 'ach',
                accountType === 'iban' ? 'eur' : 'usd'
            )
        }

        return { tokenName, chainName, xchainNeeded, liquidationAddress }
    }

    // TODO: fix type
    const handleCrossChainScenario = async (claimLinkData: any, crossChainDetails: CrossChainDetails[]) => {
        // default to optimism and usdc (and then bridge to this)
        // imported from Offramp consts

        if (!crossChainDetails) {
            throw new Error('Offramp unavailable')
        }

        const route = await utils.fetchRouteRaw(
            claimLinkData.tokenAddress,
            claimLinkData.chainId.toString(),
            usdcAddressOptimism,
            optimismChainId,
            claimLinkData.tokenDecimals,
            claimLinkData.tokenAmount,
            claimLinkData.senderAddress
        )

        if (route === undefined) {
            throw new Error('Offramp unavailable')
        }

        return {
            tokenName: utils.getBridgeTokenName(optimismChainId, usdcAddressOptimism),
            chainName: utils.getBridgeChainName(optimismChainId),
        }
    }

    const claimAndProcessLink = async (
        xchainNeeded: boolean,
        address: string,
        claimLinkData: any, // TODO: fix type
        chainId: string,
        tokenAddress: string
    ) => {
        if (xchainNeeded) {
            return await claimLinkXchain({
                address,
                link: claimLinkData.link,
                destinationChainId: chainId,
                destinationToken: tokenAddress,
            })
        } else {
            return await claimLink({
                address,
                link: claimLinkData.link,
            })
        }
    }

    const saveAndSubmitCashoutLink = async (
        claimLinkData: any, // TODO: fix type
        hash: string,
        liquidationAddress: LiquidationAddress,
        bridgeCustomerId: string,
        bridgeExternalAccountId: string,
        chainId: string,
        tokenName: string,
        peanutAccount: PeanutAccount
    ) => {
        utils.saveOfframpLinkToLocalstorage({
            data: {
                ...claimLinkData,
                depositDate: new Date(),
                USDTokenPrice: parseFloat(usdValue ?? ''),
                points: 0,
                txHash: hash,
                message: undefined,
                attachmentUrl: undefined,
                liquidationAddress: liquidationAddress.address,
                recipientType: 'bank',
                accountNumber: offrampForm.recipient,
                bridgeCustomerId: bridgeCustomerId,
                bridgeExternalAccountId: bridgeExternalAccountId,
                peanutCustomerId: user?.user?.userId,
                peanutExternalAccountId: peanutAccount.account_id,
            },
        })

        await utils.submitCashoutLink({
            link: claimLinkData.link,
            bridgeCustomerId: bridgeCustomerId,
            liquidationAddressId: liquidationAddress.id,
            cashoutTransactionHash: hash,
            externalAccountId: bridgeExternalAccountId,
            chainId: chainId,
            tokenName: tokenName,
        })
    }

    const handleError = (error: unknown) => {
        console.error('Error in handleConfirm:', error)
        setErrorState({
            showError: true,
            errorMessage:
                error instanceof Error
                    ? error.message
                    : "We've encountered an error. Your funds are SAFU, please reach out to support",
        })
        setShowRefund(true)
    }

    const getCrossChainDetails = async ({
        chainId,
        tokenType,
        contractVersion,
    }: {
        chainId: string
        tokenType: number
        contractVersion: string
    }) => {
        try {
            const crossChainDetails = await peanut.getXChainOptionsForLink({
                isTestnet: utils.isTestnetChain(chainId.toString()),
                sourceChainId: chainId.toString(),
                tokenType: tokenType,
            })

            const contractVersionCheck = peanut.compareVersions('v4.2', contractVersion, 'v') // v4.2 is the minimum version required for cross chain
            if (crossChainDetails.length > 0 && contractVersionCheck) {
                const xchainDetails = sortCrossChainDetails(
                    crossChainDetails.filter((chain: any) => chain.chainId != '1'),
                    consts.supportedPeanutChains,
                    chainId
                )
                return xchainDetails
            } else {
                return undefined
            }
        } catch (error) {
            console.log('error fetching cross chain details: ' + error)
            return undefined
        }
    }

    //////////////////////
    // functions for claim link offramps
    // TODO: they need to be refactored to a separate file

    const handleSubmitTransfer = async () => {
        if (claimLinkData && tokenPrice && estimatedPoints && attachment && recipientType) {
            try {
                setLoadingState('Submitting Offramp')

                let tokenName = utils.getBridgeTokenName(claimLinkData.chainId, claimLinkData.tokenAddress)
                let chainName = utils.getBridgeChainName(claimLinkData.chainId)
                let xchainNeeded
                if (tokenName && chainName) {
                    xchainNeeded = false
                } else {
                    xchainNeeded = true
                    if (!crossChainDetails) {
                        setErrorState({
                            showError: true,
                            errorMessage: 'offramp unavailable',
                        })
                        return
                    }

                    let route
                    try {
                        route = await utils.fetchRouteRaw(
                            claimLinkData.tokenAddress,
                            claimLinkData.chainId.toString(),
                            usdcAddressOptimism,
                            optimismChainId,
                            claimLinkData.tokenDecimals,
                            claimLinkData.tokenAmount,
                            claimLinkData.senderAddress
                        )
                    } catch (error) {
                        console.error('error fetching route', error)
                    }

                    if (route === undefined) {
                        setErrorState({
                            showError: true,
                            errorMessage: 'offramp unavailable',
                        })
                        return
                    }

                    tokenName = utils.getBridgeTokenName(optimismChainId, usdcAddressOptimism)
                    chainName = utils.getBridgeChainName(optimismChainId)
                }

                if (!user || !chainName || !tokenName) return

                const peanutAccount = user.accounts.find(
                    (account) =>
                        account.account_identifier?.toLowerCase().replaceAll(' ', '') ===
                        offrampForm?.recipient?.toLowerCase().replaceAll(' ', '')
                )
                const bridgeCustomerId = user?.user?.bridge_customer_id
                const bridgeExternalAccountId = peanutAccount?.bridge_account_id

                if (!peanutAccount || !bridgeCustomerId || !bridgeExternalAccountId) {
                    console.log('peanut account, bridgeCustomerId or bridgeExternalAccountId not found. ', {
                        peanutAccount,
                        bridgeCustomerId,
                        bridgeExternalAccountId,
                    })
                    return
                }

                const allLiquidationAddresses = await utils.getLiquidationAddresses(bridgeCustomerId)

                let liquidationAddress = allLiquidationAddresses.find(
                    (address) =>
                        address.chain === chainName &&
                        address.currency === tokenName &&
                        address.external_account_id === bridgeExternalAccountId
                )
                if (!liquidationAddress) {
                    liquidationAddress = await utils.createLiquidationAddress(
                        bridgeCustomerId,
                        chainName,
                        tokenName,
                        bridgeExternalAccountId,
                        recipientType === 'iban' ? 'sepa' : 'ach',
                        recipientType === 'iban' ? 'eur' : 'usd'
                    )
                }
                const chainId = utils.getChainIdFromBridgeChainName(chainName) ?? ''
                const tokenAddress = utils.getTokenAddressFromBridgeTokenName(chainId ?? '10', tokenName) ?? ''

                let hash
                if (xchainNeeded) {
                    hash = await claimLinkXchain({
                        address: liquidationAddress.address,
                        link: claimLinkData.link,
                        destinationChainId: chainId,
                        destinationToken: tokenAddress,
                    })
                } else {
                    hash = await claimLink({
                        address: liquidationAddress.address,
                        link: claimLinkData.link,
                    })
                }

                if (hash) {
                    utils.saveOfframpLinkToLocalstorage({
                        data: {
                            ...claimLinkData,
                            depositDate: new Date(),
                            USDTokenPrice: tokenPrice,
                            points: estimatedPoints,
                            txHash: hash,
                            message: attachment.message ? attachment.message : undefined,
                            attachmentUrl: attachment.attachmentUrl ? attachment.attachmentUrl : undefined,
                            liquidationAddress: liquidationAddress.address,
                            recipientType: recipientType,
                            accountNumber: offrampForm.recipient,
                            bridgeCustomerId: bridgeCustomerId,
                            bridgeExternalAccountId: bridgeExternalAccountId,
                            peanutCustomerId: user?.user?.userId,
                            peanutExternalAccountId: peanutAccount.account_id,
                        },
                    })
                    setTransactionHash(hash)
                    setLoadingState('Idle')
                    onNext()
                }
            } catch (error) {
                console.error('Error during the submission process:', error)
                setErrorState({ showError: true, errorMessage: 'An error occurred. Please try again later' })
            } finally {
                setLoadingState('Idle')
            }
        }
    }

    return (
        <div className="flex w-full flex-col items-center justify-center gap-4 px-2  text-center">
            <label className="text-h4">Confirm your details</label>
            <div className="flex flex-col justify-center gap-3">
                {offrampType == OfframpType.CASHOUT && (
                    <>
                        <label className="text-start text-h8 font-light">
                            Cash out your crypto to your bank account. From any token, any chain, directly to your bank
                            account.
                        </label>
                        <FAQComponent />
                    </>
                )}
                {offrampType == OfframpType.CLAIM && (
                    <label className="text-start text-h8 font-light">
                        Cash out this link's crypto directly to your bank account.
                    </label>
                )}
            </div>
            {activeStep < 3 ? (
                <GlobalKYCComponent
                    intialStep={initialKYCStep}
                    offrampForm={offrampForm}
                    setOfframpForm={setOfframpForm}
                    onCompleted={(message) => {
                        handleCompleteKYC(message)
                    }}
                />
            ) : activeStep === 3 ? (
                <GlobaLinkAccountComponent
                    accountNumber={offrampForm?.recipient}
                    onCompleted={() => {
                        handleCompleteLinkAccount('success')
                    }}
                />
            ) : (
                <div className="flex w-full flex-col items-center justify-center gap-2">
                    <label className="self-start text-h8 font-light">Please confirm all details:</label>
                    <div className="flex w-full flex-col items-center justify-center gap-2">
                        <div className="flex w-full flex-row items-center justify-between gap-1 px-2 text-h8 text-gray-1">
                            <div className="flex w-max  flex-row items-center justify-center gap-1">
                                <Icon name={'profile'} className="h-4 fill-gray-1" />
                                <label className="font-bold">Name</label>
                            </div>
                            <span className="flex flex-row items-center justify-center gap-1 text-center text-sm font-normal leading-4">
                                {user?.user?.full_name}
                            </span>
                        </div>

                        <div className="flex w-full flex-row items-center justify-between gap-1 px-2 text-h8 text-gray-1">
                            <div className="flex w-max  flex-row items-center justify-center gap-1">
                                <Icon name={'email'} className="h-4 fill-gray-1" />
                                <label className="font-bold">Email</label>
                            </div>
                            <span className="flex flex-row items-center justify-center gap-1 text-center text-sm font-normal leading-4">
                                {user?.user?.email}
                            </span>
                        </div>

                        <div className="flex w-full flex-row items-center justify-between gap-1 px-2 text-h8 text-gray-1">
                            <div className="flex w-max  flex-row items-center justify-center gap-1">
                                <Icon name={'bank'} className="h-4 fill-gray-1" />
                                <label className="font-bold">Bank account</label>
                            </div>
                            <span className="flex flex-row items-center justify-center gap-1 text-center text-sm font-normal leading-4">
                                {offrampType == OfframpType.CASHOUT
                                    ? offrampForm.recipient.toUpperCase()
                                    : offrampForm?.recipient}
                            </span>
                        </div>

                        {offrampType == OfframpType.CLAIM && (
                            <div className="flex w-full flex-row items-center justify-between gap-1 px-2 text-h8 text-gray-1">
                                <div className="flex w-max  flex-row items-center justify-center gap-1">
                                    <Icon name={'forward'} className="h-4 fill-gray-1" />
                                    <label className="font-bold">Route</label>
                                </div>
                                <span className="flex flex-row items-center justify-center gap-1 text-center text-sm font-normal leading-4">
                                    {
                                        consts.supportedPeanutChains.find(
                                            (chain) => chain.chainId === claimLinkData?.chainId
                                        )?.name
                                    }{' '}
                                    <Icon name={'arrow-next'} className="h-4 fill-gray-1" /> Offramp{' '}
                                    <Icon name={'arrow-next'} className="h-4 fill-gray-1" />{' '}
                                    {recipientType?.toUpperCase()}{' '}
                                    <MoreInfo text={`Wait, crypto can be converted to real money??? How cool!`} />
                                </span>
                            </div>
                        )}

                        <div className="flex w-full flex-row items-center justify-between gap-1 px-2 text-h8 text-gray-1">
                            <div className="flex w-max  flex-row items-center justify-center gap-1">
                                <Icon name={'gas'} className="h-4 fill-gray-1" />
                                <label className="font-bold">Fee</label>
                            </div>
                            <span className="flex flex-row items-center justify-center gap-1 text-center text-sm font-normal leading-4">
                                ${fee}
                                <MoreInfo
                                    text={feeExplainer}
                                />
                            </span>
                        </div>

                        <div className="flex w-full flex-row items-center justify-between gap-1 px-2 text-h8 text-gray-1">
                            <div className="flex w-max  flex-row items-center justify-center gap-1">
                                {offrampType == OfframpType.CLAIM && (
                                    <Icon name={'transfer'} className="h-4 fill-gray-1" />
                                )}
                                <label className="font-bold">Total</label>
                            </div>

                            <span className="flex flex-row items-center justify-center gap-1 text-center text-sm font-normal leading-4">
                                $ {amountReceived}
                                <MoreInfo
                                    text={feeExplainer + ' This will be deducted of the amount you will receive.'}
                                />
                            </span>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex w-full flex-col items-center justify-center gap-2">
                {activeStep > 3 && (
                    <button
                        onClick={() => {
                            switch (offrampType) {
                                case OfframpType.CASHOUT: {
                                    handleConfirm()
                                    break
                                }
                                case OfframpType.CLAIM: {
                                    handleSubmitTransfer()
                                    break
                                }
                            }
                        }}
                        className="btn-purple btn-xl"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <div className="flex w-full flex-row items-center justify-center gap-2">
                                <Loading /> {loadingState}
                            </div>
                        ) : (
                            'Cashout'
                        )}
                    </button>
                )}

                <button
                    className="btn btn-xl dark:border-white dark:text-white"
                    onClick={() => {
                        onPrev()
                        setActiveStep(0)
                        setErrorState({ showError: false, errorMessage: '' })
                        setOfframpForm({ email: '', name: '', recipient: '', password: '' })
                    }}
                    disabled={isLoading}
                    type="button"
                >
                    Return
                    {/* Cancel if activeStep <=3 and offramp type cashout*/}
                </button>

                {errorState.showError && errorState.errorMessage === 'KYC under review' ? (
                    <div className="text-center">
                        <label className=" text-h8 font-normal text-red ">
                            KYC is under review, it might take up to 24hrs. Chat with support to finish the process.
                        </label>
                        <CrispButton className="text-blue-600 underline">Chat with support</CrispButton>
                    </div>
                ) : errorState.errorMessage === 'KYC rejected' ? (
                    <div className="text-center">
                        <label className=" text-h8 font-normal text-red ">KYC has been rejected.</label>{' '}
                        <CrispButton className="text-blue-600 underline">Chat with support</CrispButton>
                    </div>
                ) : (
                    <div className="text-center">
                        <label className=" text-h8 font-normal text-red ">{errorState.errorMessage}</label>
                    </div>
                )}
                {showRefund && (
                    <Link href={createdLink ?? ''} className=" text-h8 font-normal ">
                        <Icon name="warning" className="-mt-0.5" /> Something went wrong while trying to cashout. Click
                        here to reclaim the link to your wallet.
                    </Link>
                )}
            </div>
        </div>
    )
}
