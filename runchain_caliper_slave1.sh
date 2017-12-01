#!/bin/bash -x

echo "Sleep for 8 seconds so the master node has initialised"
sleep 8

echo "Start the chain"

# ip=`getent hosts masternode | awk -F' ' '{print $1}'`
multichaind dockerchain@10.80.39.8:2000 -printtoconsole -shrinkdebugfilesize


echo "Setup1 /root/.multichain/multichain.conf"

cat << EOF > /root/.multichain/$CHAINNAME/multichain.conf
rpcuser=$RPC_USER
rpcpassword=$RPC_PASSWORD
rpcallowip=$RPC_ALLOW_IP
rpcport=$RPC_PORT
EOF


cp /root/.multichain/$CHAINNAME/multichain.conf /root/.multichain/multichain.conf