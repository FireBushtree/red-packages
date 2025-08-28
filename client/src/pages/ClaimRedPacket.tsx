import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { ethers } from 'ethers'
import { getContract, getReadOnlyContract } from '../utils/contract'

declare global {
  interface Window {
    ethereum?: any;
  }
}

interface RedPacketInfo {
  creator: string
  totalAmount: string
  remainingAmount: string
  remainingPackets: string
  createdAt: string
  claimers: string[]
  claimedAmounts: string[]
}

function ClaimRedPacket() {
  const { id } = useParams<{ id: string }>()
  const [account, setAccount] = useState<string>('')
  const [isConnected, setIsConnected] = useState(false)
  const [packetInfo, setPacketInfo] = useState<RedPacketInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)
  const [hasClaimed, setHasClaimed] = useState(false)

  useEffect(() => {
    checkConnection()
    if (id) {
      loadPacketInfo()
    }
  }, [id])

  useEffect(() => {
    if (account && id) {
      checkIfClaimed()
    }
  }, [account, id])

  const checkConnection = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' })
        if (accounts.length > 0) {
          setAccount(accounts[0])
          setIsConnected(true)
        }
      } catch (error) {
        console.error('Error checking connection:', error)
      }
    }
  }

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('请安装 MetaMask!')
      return
    }

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      })
      setAccount(accounts[0])
      setIsConnected(true)
    } catch (error) {
      console.error('连接钱包失败:', error)
      alert('连接钱包失败')
    }
  }

  const loadPacketInfo = async () => {
    if (!id) return

    try {
      setLoading(true)
      const contract = await getReadOnlyContract()
      const [info, amounts] = await Promise.all([
        contract.getRedPacketInfo(id),
        contract.getRedPacketAmounts(id)
      ])

      // 计算已领取的金额数组
      const claimedCount = info[5].length
      const claimedAmounts = amounts.slice(0, claimedCount).map((amount: any) => ethers.formatEther(amount))

      setPacketInfo({
        creator: info[0],
        totalAmount: ethers.formatEther(info[1]),
        remainingAmount: ethers.formatEther(info[2]),
        remainingPackets: info[3].toString(),
        createdAt: new Date(Number(info[4]) * 1000).toLocaleString(),
        claimers: info[5],
        claimedAmounts
      })
    } catch (error) {
      console.error('获取红包信息失败:', error)
      // alert('红包不存在或已过期')
    } finally {
      setLoading(false)
    }
  }

  const checkIfClaimed = async () => {
    if (!id || !account) return

    try {
      const contract = await getReadOnlyContract()
      const claimed = await contract.hasClaimedRedPacket(id, account)
      setHasClaimed(claimed)
    } catch (error) {
      console.error('检查领取状态失败:', error)
    }
  }

  const claimRedPacket = async () => {
    if (!id || !isConnected) {
      alert('请先连接钱包')
      return
    }

    if (hasClaimed) {
      alert('您已经领取过此红包')
      return
    }

    if (packetInfo?.remainingPackets === '0') {
      alert('红包已被领完')
      return
    }

    setClaiming(true)
    try {
      const contract = await getContract()
      const tx = await contract.claimRedPacket(id)
      await tx.wait()

      alert('恭喜！红包领取成功！')
      setHasClaimed(true)
      loadPacketInfo() // 重新加载红包信息
    } catch (error) {
      console.error('领取红包失败:', error)
      alert('领取红包失败: ' + (error as Error).message)
    } finally {
      setClaiming(false)
    }
  }

  if (!id) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">无效的红包链接</h1>
          <p className="text-gray-600">请检查链接是否正确</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-600">加载红包信息中...</p>
        </div>
      </div>
    )
  }

  if (!packetInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">红包不存在</h1>
          <p className="text-gray-600">该红包可能已过期或链接无效</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-yellow-50 p-4">
      <div className="max-w-md mx-auto">
        {/* 红包信息卡片 */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 text-white text-center">
            <h1 className="text-2xl font-bold mb-2">🧧 恭喜发财</h1>
            <p className="text-red-100">来自 {packetInfo.creator.slice(0, 6)}...{packetInfo.creator.slice(-4)} 的红包</p>
          </div>

          <div className="p-6">
            <div className="text-center mb-6">
              <div className="text-3xl font-bold text-gray-800 mb-2">
                {packetInfo.remainingAmount} ETH
              </div>
              <p className="text-gray-600">剩余金额</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="text-center">
                <div className="text-xl font-semibold text-gray-800">
                  {packetInfo.remainingPackets}
                </div>
                <p className="text-sm text-gray-600">剩余个数</p>
              </div>
              <div className="text-center">
                <div className="text-xl font-semibold text-gray-800">
                  {packetInfo.claimers.length}
                </div>
                <p className="text-sm text-gray-600">已领取</p>
              </div>
            </div>

            <div className="text-center text-sm text-gray-500 mb-6">
              创建时间: {packetInfo.createdAt}
            </div>

            {!isConnected ? (
              <button
                onClick={connectWallet}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-4 rounded-lg transition-colors font-medium text-lg"
              >
                连接钱包领取红包
              </button>
            ) : (
              <div>
                <div className="mb-4 p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-700 text-center">
                    已连接: {account.slice(0, 6)}...{account.slice(-4)}
                  </p>
                </div>

                {hasClaimed ? (
                  <div className="bg-gray-100 text-gray-500 py-4 rounded-lg text-center font-medium">
                    您已经领取过此红包
                  </div>
                ) : packetInfo.remainingPackets === '0' ? (
                  <div className="bg-gray-100 text-gray-500 py-4 rounded-lg text-center font-medium">
                    红包已被领完
                  </div>
                ) : packetInfo.creator.toLowerCase() === account.toLowerCase() ? (
                  <div className="bg-gray-100 text-gray-500 py-4 rounded-lg text-center font-medium">
                    不能领取自己的红包
                  </div>
                ) : (
                  <button
                    onClick={claimRedPacket}
                    disabled={claiming}
                    className="w-full bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white py-4 rounded-lg transition-colors font-medium text-lg"
                  >
                    {claiming ? '领取中...' : '🧧 领取红包'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 领取记录 */}
        {packetInfo.claimers.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-3">领取记录</h3>
            <div className="space-y-2">
              {packetInfo.claimers.map((claimer, index) => (
                <div key={index} className="flex justify-between items-center py-3 px-3 bg-gray-50 rounded">
                  <div>
                    <span className="text-sm text-gray-800 font-medium">
                      {claimer.slice(0, 6)}...{claimer.slice(-4)}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-red-600">
                      {packetInfo.claimedAmounts[index] || '0'} ETH
                    </div>
                    <div className="text-xs text-gray-500">已领取</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ClaimRedPacket