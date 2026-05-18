export const PAYMASTER_ABI = [
	{
		name: 'deposit',
		type: 'function',
		stateMutability: 'nonpayable',
		inputs: [],
		outputs: []
	},
	{
		name: 'withdraw',
		type: 'function',
		stateMutability: 'nonpayable',
		inputs: [{ name: 'amount', type: 'uint256' }],
		outputs: []
	},
	{
		name: 'deductInference',
		type: 'function',
		stateMutability: 'nonpayable',
		inputs: [
			{ name: 'user',     type: 'address' },
			{ name: 'provider', type: 'address' },
			{ name: 'cost',     type: 'uint256' },
			{ name: 'modelId',  type: 'string' }
		],
		outputs: []
	},
	{
		name: 'getStats',
		type: 'function',
		stateMutability: 'view',
		inputs: [{ name: 'user', type: 'address' }],
		outputs: [
			{ name: 'balance', type: 'uint256' },
			{ name: 'spent',   type: 'uint256' },
			{ name: 'queries', type: 'uint256' }
		]
	},
	{
		name: 'InferenceDeducted',
		type: 'event',
		inputs: [
			{ name: 'user',        type: 'address', indexed: true  },
			{ name: 'provider',    type: 'address', indexed: true  },
			{ name: 'userCost',    type: 'uint256', indexed: false },
			{ name: 'providerCut', type: 'uint256', indexed: false },
			{ name: 'protocolFee', type: 'uint256', indexed: false },
			{ name: 'modelId',     type: 'string',  indexed: false }
		]
	}
] as const;

export const ERC20_ABI = [
	{
		name: 'transfer',
		type: 'function',
		stateMutability: 'nonpayable',
		inputs: [
			{ name: 'to',     type: 'address' },
			{ name: 'amount', type: 'uint256' }
		],
		outputs: [{ type: 'bool' }]
	},
	{
		name: 'approve',
		type: 'function',
		stateMutability: 'nonpayable',
		inputs: [
			{ name: 'spender', type: 'address' },
			{ name: 'amount',  type: 'uint256' }
		],
		outputs: [{ type: 'bool' }]
	},
	{
		name: 'balanceOf',
		type: 'function',
		stateMutability: 'view',
		inputs: [{ name: 'account', type: 'address' }],
		outputs: [{ type: 'uint256' }]
	},
	{
		name: 'allowance',
		type: 'function',
		stateMutability: 'view',
		inputs: [
			{ name: 'owner',   type: 'address' },
			{ name: 'spender', type: 'address' }
		],
		outputs: [{ type: 'uint256' }]
	}
] as const;

export const STREAM_ABI = [
	{
		name: 'createStream',
		type: 'function',
		stateMutability: 'nonpayable',
		inputs: [
			{ name: 'recipient',   type: 'address' },
			{ name: 'duration',    type: 'uint256' },
			{ name: 'totalAmount', type: 'uint256' }
		],
		outputs: [{ name: 'id', type: 'uint256' }]
	},
	{
		name: 'cancel',
		type: 'function',
		stateMutability: 'nonpayable',
		inputs: [{ name: 'id', type: 'uint256' }],
		outputs: []
	},
	{
		name: 'claimable',
		type: 'function',
		stateMutability: 'view',
		inputs: [{ name: 'id', type: 'uint256' }],
		outputs: [{ type: 'uint256' }]
	},
	{
		name: 'streams',
		type: 'function',
		stateMutability: 'view',
		inputs: [{ name: 'id', type: 'uint256' }],
		outputs: [
			{ name: 'payer',         type: 'address' },
			{ name: 'recipient',     type: 'address' },
			{ name: 'ratePerSecond', type: 'uint256' },
			{ name: 'deposit',       type: 'uint256' },
			{ name: 'startTime',     type: 'uint256' },
			{ name: 'endTime',       type: 'uint256' },
			{ name: 'withdrawn',     type: 'uint256' },
			{ name: 'active',        type: 'bool'    }
		]
	}
] as const;
