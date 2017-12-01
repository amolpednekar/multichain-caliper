#!/bin/bash -x

sleep 10

multichaind AMOLCHAIN@172.27.0.2:5000 --port=6000 --rpcport=5999

cat << EOF > /root/.multichain/$CHAINNAME/multichain.conf
rpcuser=$RPC_USER
rpcpassword=$RPC_PASSWORD
rpcallowip=$RPC_ALLOW_IP
rpcport=$RPC_PORT
EOF