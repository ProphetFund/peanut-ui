import TokenAmountInput from '@/components/Global/TokenAmountInput'
import * as _consts from '../Create.consts'
import FileUploadInput from '@/components/Global/FileUploadInput'
import { useAccount } from 'wagmi'
import { useWeb3Modal } from '@web3modal/wagmi/react'
import { useCallback, useContext, useEffect, useState } from 'react'
import * as context from '@/context'
import Loading from '@/components/Global/Loading'
import TokenSelector from '@/components/Global/TokenSelector/TokenSelector'
import { peanut } from '@squirrel-labs/peanut-sdk'
import AddressInput from '@/components/Global/AddressInput'
import { getTokenDetails } from '@/components/Create/Create.utils'
import { useBalance } from '@/hooks/useBalance'
import * as utils from '@/utils'

export const InitialView = ({
    onNext,
    onPrev,
    setLink,
    setAttachmentOptions,
    attachmentOptions,
    tokenValue,
    setTokenValue,
    usdValue,
    setUsdValue,
    recipientAddress,
    setRecipientAddress,
}: _consts.ICreateScreenProps) => {
    const { isConnected, address } = useAccount()
    const { open } = useWeb3Modal()
    const { balances } = useBalance()
    const { selectedTokenPrice, inputDenomination, selectedChainID, selectedTokenAddress } = useContext(
        context.tokenSelectorContext
    )
    const { setLoadingState, loadingState, isLoading } = useContext(context.loadingStateContext)
    const [errorState, setErrorState] = useState<{
        showError: boolean
        errorMessage: string
    }>({ showError: false, errorMessage: '' })

    const [_tokenValue, _setTokenValue] = useState<string | undefined>(
        inputDenomination === 'TOKEN' ? tokenValue : usdValue
    )

    const handleConnectWallet = async () => {
        open()
    }

    const handleOnNext = useCallback(async () => {
        if (!recipientAddress) {
            setErrorState({
                showError: true,
                errorMessage: 'Please enter a recipient address',
            })
            return
        }

        setLoadingState('Creating link')

        const tokenDetails = getTokenDetails(selectedTokenAddress, selectedChainID, balances)
        try {
            const { link } = await peanut.createRequestLink({
                chainId: selectedChainID,
                recipientAddress: recipientAddress,
                tokenAddress: selectedTokenAddress,
                tokenAmount: _tokenValue ?? '',
                tokenDecimals: tokenDetails.tokenDecimals.toString(),
                tokenType: tokenDetails.tokenType,
                apiUrl: '/api/proxy/withFormData',
                baseUrl: `${window.location.origin}/request/pay`,
                APIKey: 'doesnt-matter',
                attachment: attachmentOptions?.rawFile || undefined,
                reference: attachmentOptions?.message || undefined,
            })

            const requestLinkDetails: any = await peanut.getRequestLinkDetails({ link: link, apiUrl: '/api/proxy/get' })
            utils.saveRequestLinkToLocalStorage({ details: requestLinkDetails })

            setLink(link)
            onNext()
        } catch (error) {
            setErrorState({
                showError: true,
                errorMessage: 'Failed to create link',
            })
            console.error('Failed to create link:', error)
        } finally {
            setLoadingState('Idle')
        }
    }, [recipientAddress, _tokenValue, attachmentOptions])

    useEffect(() => {
        if (!_tokenValue) return
        if (inputDenomination === 'TOKEN') {
            setTokenValue(_tokenValue)
            if (selectedTokenPrice) {
                setUsdValue((parseFloat(_tokenValue) * selectedTokenPrice).toString())
            }
        } else if (inputDenomination === 'USD') {
            setUsdValue(_tokenValue)
            if (selectedTokenPrice) {
                setTokenValue((parseFloat(_tokenValue) / selectedTokenPrice).toString())
            }
        }
    }, [_tokenValue, inputDenomination])

    const [isValidRecipient, setIsValidRecipient] = useState(false)
    const [inputChanging, setInputChanging] = useState(false)

    return (
        <div className="flex w-full flex-col items-center justify-center gap-6 text-center">
            <label
                className="max-h-[92px] w-full overflow-hidden text-h2"
                style={{ display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical' }}
            >
                Request a payment
            </label>
            <label className="w-full max-w-96 text-start text-h8 font-light">
                You will request a payment to {recipientAddress ? recipientAddress : '...'} <br />
                Choose your preffered token and chain.
            </label>

            <div className="flex w-full flex-col items-center justify-center gap-3">
                <TokenAmountInput
                    className="w-full"
                    setTokenValue={(value) => {
                        _setTokenValue(value ?? '')
                    }}
                    tokenValue={_tokenValue}
                    onSubmit={() => {
                        if (!isConnected) handleConnectWallet()
                        else handleOnNext()
                    }}
                />
                <TokenSelector classNameButton="w-full" />

                <FileUploadInput attachmentOptions={attachmentOptions} setAttachmentOptions={setAttachmentOptions} />
                <AddressInput
                    value={recipientAddress ?? ''}
                    _setIsValidRecipient={(valid: boolean) => {
                        setIsValidRecipient(valid)
                        setInputChanging(false)
                    }}
                    onDeleteClick={() => {
                        setRecipientAddress('')
                        setInputChanging(false)
                    }}
                    onSubmit={(recipient: string) => {
                        setRecipientAddress(recipient)
                        setInputChanging(false)
                    }}
                    setIsValueChanging={(value: boolean) => {
                        setInputChanging(value)
                    }}
                    placeholder="Enter recipient address"
                    className="w-full"
                />
            </div>

            <div className="flex w-full flex-col items-center justify-center gap-3">
                <button
                    className="wc-disable-mf btn-purple btn-xl "
                    onClick={() => {
                        if (!isConnected) handleConnectWallet()
                        else handleOnNext()
                    }}
                    disabled={!isValidRecipient || inputChanging || isLoading || !tokenValue}
                >
                    {isLoading ? (
                        <div className="flex w-full flex-row items-center justify-center gap-2">
                            <Loading /> {loadingState}
                        </div>
                    ) : (
                        'Confirm'
                    )}
                </button>
                <button className="btn btn-xl" onClick={onPrev} disabled={isLoading}>
                    Return
                </button>
                {errorState.showError && (
                    <div className="text-center">
                        <label className=" text-h8 font-normal text-red ">{errorState.errorMessage}</label>
                    </div>
                )}
            </div>
        </div>
    )
}
