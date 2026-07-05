use soroban_sdk::{contracttype, Address, Env};

/// Instance storage TTL bump (~30 days at 5s/ledger).
pub const INSTANCE_BUMP_AMOUNT: u32 = 518_400;
pub const INSTANCE_LIFETIME_THRESHOLD: u32 = INSTANCE_BUMP_AMOUNT - 20_000;

/// Persistent storage TTL bump (~90 days at 5s/ledger).
pub const BALANCE_BUMP_AMOUNT: u32 = 1_555_200;
pub const BALANCE_LIFETIME_THRESHOLD: u32 = BALANCE_BUMP_AMOUNT - 20_000;

#[derive(Clone)]
#[contracttype]
pub struct AllowanceDataKey {
    pub from: Address,
    pub spender: Address,
}

#[derive(Clone)]
#[contracttype]
pub struct AllowanceValue {
    pub amount: i128,
    pub expiration_ledger: u32,
}

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Allowance(AllowanceDataKey),
    Balance(Address),
    Admin,
    Metadata,
}

pub fn read_admin(env: &Env) -> Address {
    env.storage().instance().get(&DataKey::Admin).unwrap()
}

pub fn write_admin(env: &Env, admin: &Address) {
    env.storage().instance().set(&DataKey::Admin, admin);
}

pub fn has_admin(env: &Env) -> bool {
    env.storage().instance().has(&DataKey::Admin)
}

pub fn read_allowance(env: &Env, from: Address, spender: Address) -> AllowanceValue {
    let key = DataKey::Allowance(AllowanceDataKey { from, spender });
    if let Some(allowance) = env.storage().temporary().get::<_, AllowanceValue>(&key) {
        if allowance.expiration_ledger < env.ledger().sequence() {
            AllowanceValue {
                amount: 0,
                expiration_ledger: allowance.expiration_ledger,
            }
        } else {
            allowance
        }
    } else {
        AllowanceValue {
            amount: 0,
            expiration_ledger: 0,
        }
    }
}

pub fn write_allowance(
    env: &Env,
    from: Address,
    spender: Address,
    amount: i128,
    expiration_ledger: u32,
) {
    let allowance = AllowanceValue {
        amount,
        expiration_ledger,
    };

    if amount > 0 && expiration_ledger < env.ledger().sequence() {
        panic!("expiration_ledger is less than ledger sequence when amount > 0");
    }

    let key = DataKey::Allowance(AllowanceDataKey { from, spender });
    env.storage().temporary().set(&key, &allowance);

    if amount > 0 {
        let live_for = expiration_ledger
            .checked_sub(env.ledger().sequence())
            .unwrap_or(0);
        env.storage()
            .temporary()
            .extend_ttl(&key, live_for, live_for);
    }
}

pub fn spend_allowance(env: &Env, from: Address, spender: Address, amount: i128) {
    let allowance = read_allowance(env, from.clone(), spender.clone());
    if allowance.amount < amount {
        panic!("insufficient allowance");
    }
    if amount > 0 {
        write_allowance(
            env,
            from,
            spender,
            allowance.amount - amount,
            allowance.expiration_ledger,
        );
    }
}

pub fn read_balance(env: &Env, addr: Address) -> i128 {
    let key = DataKey::Balance(addr);
    if let Some(balance) = env.storage().persistent().get::<_, i128>(&key) {
        env.storage().persistent().extend_ttl(
            &key,
            BALANCE_LIFETIME_THRESHOLD,
            BALANCE_BUMP_AMOUNT,
        );
        balance
    } else {
        0
    }
}

fn write_balance(env: &Env, addr: Address, amount: i128) {
    let key = DataKey::Balance(addr);
    env.storage().persistent().set(&key, &amount);
    env.storage()
        .persistent()
        .extend_ttl(&key, BALANCE_LIFETIME_THRESHOLD, BALANCE_BUMP_AMOUNT);
}

pub fn receive_balance(env: &Env, addr: Address, amount: i128) {
    let balance = read_balance(env, addr.clone());
    write_balance(
        env,
        addr,
        balance.checked_add(amount).expect("balance overflow"),
    );
}

pub fn spend_balance(env: &Env, addr: Address, amount: i128) {
    let balance = read_balance(env, addr.clone());
    if balance < amount {
        panic!("insufficient balance");
    }
    write_balance(env, addr, balance - amount);
}

pub fn extend_instance_ttl(env: &Env) {
    env.storage()
        .instance()
        .extend_ttl(INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);
}
