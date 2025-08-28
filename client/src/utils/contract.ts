import { ethers } from 'ethers'
import axios from 'axios'

export interface ContractInfo {
  abi: any[]
  networks: {
    [networkId: string]: {
      address: string
    }
  }
}

let contractInfo: any = null

export const loadContractInfo = async (): Promise<ContractInfo> => {
  if (!contractInfo) {
    try {
      const response = await axios.get('/RedPacket.json')
      contractInfo = response.data
    } catch (error) {
      console.error('Failed to load contract info:', error)
      throw error
    }
  }
  return contractInfo
}

export const getContract = async () => {
  if (!window.ethereum) {
    throw new Error('MetaMask not installed')
  }

  const provider = new ethers.BrowserProvider(window.ethereum)
  const signer = await provider.getSigner()
  const contractInfo = await loadContractInfo()
  const networkId = '5777'

  const contractAddress = contractInfo.networks[networkId].address
  const contract = new ethers.Contract(contractAddress, contractInfo.abi, signer)

  return contract
}
