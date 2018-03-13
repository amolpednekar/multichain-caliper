#!/bin/bash

mkdir -p /root/Multichain/multichain-caliper/node-data

multichain-util create testchain --datadir=/root/Multichain/multichain-caliper/node-data

sed -i "s/^anyone-can-connect.*/anyone-can-connect = true/" /root/Multichain/multichain-caliper/node-data/testchain/params.dat
sed -i "s/^target-block-time.*/target-block-time = 2/" /root/Multichain/multichain-caliper/node-data/testchain/params.dat

cat << EOF >  /root/Multichain/multichain-caliper/node-data/testchain/multichain.conf
rpcuser=username
rpcpassword=password
rpcallowip=0.0.0.0/0.0.0.0
EOF

cat /root/Multichain/multichain-caliper/node-data/testchain/params.dat
cat /root/Multichain/multichain-caliper/node-data/testchain/multichain.conf
cat /root/Multichain/multichain-caliper/server/event-listener-websockets/script.sh
multichaind testchain --datadir=/root/Multichain/multichain-caliper/node-data --port=1000 --rpcport=999 --autosubscribe=streams --blocknotify="/root/Multichain/multichain-caliper/server/event-listener-websockets/script.sh %s"