'use client'

import React, {useEffect, useMemo, useState} from "react";
import {LeaderboardUserData} from "@/types/types";
import {shortAddressForm} from "@/utils/utils";
import CopyTextButton from "@/components/common/CopyTextButton";
import { TrophyIcon } from "@heroicons/react/24/outline";
import {useActiveAccount} from "thirdweb/react";
import {ZERO_ACCOUNT} from "@/containers/VaultsContainer";

export default function Page() {
    const [leaderboardData, setLeaderboardData] = useState<LeaderboardUserData[]>([])
    const [loadingLeaderboardData, setLoadingLeaderboardData] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const currentUserAccount = useActiveAccount() || ZERO_ACCOUNT;

    const leaderboardMockData: LeaderboardUserData[] = useMemo(() => ([
        {
            rank: 1,
            address: '0x01067B85F311767Dd89c82cB8c5f4A75F3c0Ea60'
        },
        {
            rank: 2,
            address: '0x01067B85F311767Dd89c82cB8c5f4A75F3c0Ea58'
        },
        {
            rank: 3,
            address: '0x01067B85F311767Dd89c82cB8c5f4A75F3c0Ea59'
        },
        {
            rank: 4,
            address: '0x01067B85F311767Dd89c82cB8c5f4A75F3c0Ea61'
        },
        {
            rank: 5,
            address: '0x01067B85F311767Dd89c82cB8c5f4A75F3c0Ea57'
        }
    ]), []);

    const filteredRows = useMemo(() => {
        if (!searchQuery || !searchQuery.trim()) return leaderboardData;
        setLoadingLeaderboardData(true);
        const filteredRows = leaderboardData.filter(item =>
            item.address.toLowerCase().includes(searchQuery.trim().toLowerCase())
        );
        setLoadingLeaderboardData(false);
        return filteredRows;
    }, [leaderboardData, searchQuery]);
    const handleSearch = () => {
        setSearchQuery(searchTerm);
    };
    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    const getRankColor = (rank: number) => {
        switch (rank) {
            case 1:
                return 'text-yellow-400';
            case 2:
                return 'text-gray-300';
            case 3:
                return 'text-amber-600';
            default:
                return 'text-gray-500';
        }
    };

    useEffect(() => {
        setTimeout(() => {
            setLeaderboardData(leaderboardMockData);
            setLoadingLeaderboardData(false);
        }, 5000)
    }, [leaderboardMockData]);
    return (
        <div className='flex flex-col py-10 lg:py-20 w-full container gap-10 lg:gap-20'>
            <div className='flex-center'>
                <div className='relative'>
                    <h1 className='text-3xl lg:text-5xl font-fustat font-semibold leading-none lg:leading-none text-white'>Leaderboard</h1>
                    <div
                        className='absolute bottom-0 left-1/2 -translate-x-1/2 w-[105%] translate-y-full mt-1 bg-gradient-to-tr from-themeColor to-white h-0.5 lg:h-1 rounded-xl'></div>
                </div>
            </div>
            <div className='flex flex-col p-4 lg:p-6 border border-gray-800 bg-gray-900 rounded gap-4 lg:gap-6'>
                <div className='flex gap-2 lg:gap-3'>
                    <input type="text" placeholder='Search user'
                           value={searchTerm}
                           onChange={(e) => setSearchTerm(e.target.value)}
                           onKeyDown={handleKeyPress}
                           className='bg-black w-full outline-0 decoration-0 rounded-lg text-white border border-customGray500 placeholder:text-white px-3 py-1'/>
                    <button
                        onClick={handleSearch}
                        className='py-2 px-5 border border-customGray500 hover:bg-gray-800 rounded-lg bg-black'>Search
                    </button>
                </div>
                <div className='flex flex-col'>
                    <h2 className='text-white text-xl font-fustat font-semibold'>User Points</h2>
                    <p className='text-white text-sm lg:text-base italic'>Points are earned for total amount deposited
                        across vaults (converted to USD equivalent at current asset price) multiplied by the length of
                        time the deposits have been / were in the vault.</p>
                </div>
                <div className="overflow-x-auto mt-6">
                    <table className="min-w-full text-zinc-100">
                        <thead className="bg-gray-800">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-medium text-zinc-300 tracking-wider">
                                    Rank
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-zinc-300 tracking-wider">
                                    User Address
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-gray-900">
                            {loadingLeaderboardData ? (
                                    Array.from({ length: 5 }).map((_, index) => (
                                        <LoadingRow key={index} />
                                    ))
                                ) : (
                                    filteredRows.map((item, key) => {
                                        const isCurrentUser = item.address.toLowerCase() === currentUserAccount.address.toLowerCase();
                                        return (
                                            <tr key={key}
                                                role="button"
                                                className={`
                                                transition-colors
                                                ${isCurrentUser ? 'bg-blue-900/30 hover:bg-blue-900/40' : 'hover:bg-gray-800'}
                                                ${isCurrentUser ? 'relative' : ''}
                                            `}
                                            >
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    {isCurrentUser && (
                                                        <div className="absolute left-0 top-0 w-1 h-full bg-blue-500" />
                                                    )}
                                                    <div className="flex items-center gap-2">
                                                        {item.rank <= 3 || isCurrentUser ? (
                                                            <TrophyIcon
                                                                className={`${getRankColor(item.rank)} w-4 h-4`}
                                                            />
                                                        ) : null}
                                                        <span
                                                            className={item.rank <= 3 ? 'font-bold' : ''}>{item.rank}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <div className='flex items-center gap-2'>
                                            <span className='line-clamp-1'>
                                                {shortAddressForm(item.address)}
                                            </span>
                                                        <CopyTextButton text={item.address}/>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })
                                )
                            }
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

const LoadingRow = () => (
    <tr className="animate-pulse">
        <td className="px-4 py-4 whitespace-nowrap">
            <div className='h-6'>
                <div className="h-4 w-4 bg-gray-700 rounded"></div>
            </div>
        </td>
        <td className="px-4 py-4 whitespace-nowrap">
            <div className="flex items-center gap-2 h-6">
                <div className="h-4 w-32 bg-gray-700 rounded"></div>
                <div className="h-4 w-4 bg-gray-700 rounded"></div>
            </div>
        </td>
    </tr>
);
