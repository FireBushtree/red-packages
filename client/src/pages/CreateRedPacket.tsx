import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { getContract } from '../utils/contract'

declare global {
  interface Window {
    ethereum?: any;
  }
}

function CreateRedPacket() {
  const [account, setAccount] = useState<string>('')
  const [isConnected, setIsConnected] = useState(false)
  const [amount, setAmount] = useState('')
  const [count, setCount] = useState('')
  const [message, setMessage] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    checkConnection()
  }, [])

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
      alert('连接钱包失败，请确保已连接到Ganache测试网络')
    }
  }

  const createRedPacket = async () => {
    if (!isConnected) {
      alert('请先连接钱包')
      return
    }

    if (!amount || !count || !message) {
      alert('请填写完整信息')
      return
    }

    if (parseFloat(amount) <= 0) {
      alert('金额必须大于0')
      return
    }

    if (parseInt(count) <= 0 || parseInt(count) > 100) {
      alert('红包数量必须在1-100之间')
      return
    }

    setIsCreating(true)
    try {
      const contract = await getContract()
      const amountWei = ethers.parseEther(amount)

      const tx = await contract.createRedPacket(parseInt(count), {
        value: amountWei,
      })

      const receipt = await tx.wait()
      const packetId = receipt.logs[0]?.topics[1]
      alert(`红包创建成功! 红包ID: ${packetId ? parseInt(packetId, 16) : '未知'}`)

      setAmount('')
      setCount('')
      setMessage('')
    } catch (error) {
      console.error('创建红包失败:', error)
      alert('创建红包失败: ' + (error as Error).message)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">
          创建红包
        </h1>

        {!isConnected ? (
          <div className="text-center">
            <p className="text-gray-600 mb-4">请先连接您的 MetaMask 钱包</p>
            <button
              onClick={connectWallet}
              className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg transition-colors font-medium"
            >
              连接 MetaMask
            </button>
          </div>
        ) : (
          <div>
            <div className="mb-4 p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-700">
                已连接: {account.slice(0, 6)}...{account.slice(-4)}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  红包总金额 (ETH)
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="0.1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  红包数量 (1-100)
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={count}
                  onChange={(e) => setCount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="10"
                />
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-700 mb-2">
                  <strong>红包规则：</strong>
                </p>
                <ul className="text-sm text-blue-600 space-y-1">
                  <li>• 可自定义红包总金额和数量</li>
                  <li>• 系统将随机分配每个红包的金额</li>
                  <li>• 每个红包至少包含1 wei</li>
                </ul>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  祝福语
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  rows={3}
                  placeholder="恭喜发财，红包拿来！"
                />
              </div>

              <button
                onClick={createRedPacket}
                disabled={isCreating}
                className="w-full bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white py-3 rounded-lg transition-colors font-medium"
              >
                {isCreating ? '创建中...' : '创建红包'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CreateRedPacket