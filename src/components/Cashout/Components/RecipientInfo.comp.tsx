import Icon from '@/components/Global/Icon'
import { Menu, Transition } from '@headlessui/react'

export const RecipientInfoComponent = ({ className }: { className?: string }) => {
    return (
        <div className={`flex w-full items-center justify-start gap-1 text-left text-h8 ${className}`}>
            Recipient account:{' '}
            <Menu className="relative" as="div">
                <>
                    <Menu.Button className="flex items-center justify-center">
                        <Icon name={'info'} className={`transition-transform dark:fill-white`} />
                    </Menu.Button>
                    <Transition
                        enter="transition-opacity duration-150 ease-out"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="transition-opacity duration-100 ease-out"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <Menu.Items className="shadow-primary-4 absolute bottom-full right-0 z-[999] mb-1 mr-1 w-64 border border-n-1 bg-white px-4 py-2 md:left-0 md:right-auto">
                            <Menu.Item as={'label'} className={'text-h8 font-normal'}>
                                You can claim directly to your IBAN OR US bank account. Click{' '}
                                <a
                                    href="https://docs.peanut.to/app/cashout/supported-geographies"
                                    target="_blank"
                                    className="underline"
                                >
                                    here
                                </a>{' '}
                                to see if your region is supported.
                            </Menu.Item>
                        </Menu.Items>
                    </Transition>
                </>
            </Menu>
        </div>
    )
}
