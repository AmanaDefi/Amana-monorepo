import localFont from 'next/font/local'

export const fustat = localFont({
    src: [
        {
            path: '../fonts/Fustat-Regular.woff2',
            weight: '400',
            style: 'normal',
        },
        {
            path: '../fonts/Fustat-SemiBold.woff2',
            weight: '600',
            style: 'normal',
        },
        {
            path: '../fonts/Fustat-Bold.woff2',
            weight: '700',
            style: 'normal',
        }
    ],
    display: 'swap',
    variable: '--font-fustat'
})
