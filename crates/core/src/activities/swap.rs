//! Same-account asset swaps that realize gains on the given asset.
//!
//! A swap is stored as two ordinary trades, so the engine books it with its
//! existing SELL and BUY rules: a SELL of the given asset and a BUY of the
//! received asset, both with the `SWAP` subtype and one shared
//! `source_group_id`. The BUY costs exactly what the SELL returns (its final
//! amount after the fee), so the account's cash does not move. Deleting either
//! leg deletes the group (the activity repository already does this for any
//! shared `source_group_id`).

use rust_decimal::Decimal;
use uuid::Uuid;

use crate::activities::activities_constants::{
    ACTIVITY_SUBTYPE_SWAP, ACTIVITY_TYPE_BUY, ACTIVITY_TYPE_SELL,
};
use crate::activities::{ActivityError, AssetResolutionInput, NewActivity, SwapRequest};

/// The SELL and BUY legs a swap request stores.
pub(crate) fn build_swap_legs(
    request: &SwapRequest,
) -> Result<(NewActivity, NewActivity), ActivityError> {
    let from_quantity = positive(request.from_quantity, "Quantity given")?;
    let to_quantity = positive(request.to_quantity, "Quantity received")?;
    let unit_price = positive(request.from_unit_price, "Market price")?;
    let fee_quantity = request.fee_quantity.unwrap_or(Decimal::ZERO);
    if fee_quantity.is_sign_negative() {
        return Err(invalid("Fee quantity cannot be negative"));
    }
    if fee_quantity >= from_quantity {
        return Err(invalid("Fee quantity must be less than the quantity given"));
    }
    if same_asset(&request.from_asset, &request.to_asset)? {
        return Err(invalid("A swap needs two different assets"));
    }

    let overflow = || invalid("Swap value is too large");
    let fee = fee_quantity.checked_mul(unit_price).ok_or_else(overflow)?;
    let proceeds = from_quantity
        .checked_mul(unit_price)
        .and_then(|gross| gross.checked_sub(fee))
        .ok_or_else(overflow)?;
    let to_unit_price = proceeds.checked_div(to_quantity).ok_or_else(overflow)?;

    let group_id = request
        .source_group_id
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_string)
        .unwrap_or_else(|| format!("wf-swap-{}", Uuid::new_v4()));

    let leg = |activity_type: &str,
               asset: &AssetResolutionInput,
               quantity: Decimal,
               unit_price: Decimal,
               fee: Decimal| NewActivity {
        id: None,
        account_id: request.account_id.clone(),
        asset: Some(asset.clone()),
        activity_type: activity_type.to_string(),
        subtype: Some(ACTIVITY_SUBTYPE_SWAP.to_string()),
        activity_date: request.activity_date.clone(),
        quantity: Some(quantity),
        unit_price: Some(unit_price),
        currency: request.currency.clone(),
        fee: Some(fee),
        tax: None,
        amount: Some(proceeds),
        status: None,
        notes: request.notes.clone(),
        fx_rate: None,
        metadata: None,
        needs_review: None,
        source_system: Some("MANUAL".to_string()),
        source_record_id: None,
        source_group_id: Some(group_id.clone()),
        idempotency_key: None,
        import_run_id: None,
    };

    Ok((
        leg(
            ACTIVITY_TYPE_SELL,
            &request.from_asset,
            from_quantity,
            unit_price,
            fee,
        ),
        leg(
            ACTIVITY_TYPE_BUY,
            &request.to_asset,
            to_quantity,
            to_unit_price,
            Decimal::ZERO,
        ),
    ))
}

fn positive(value: Option<Decimal>, field: &str) -> Result<Decimal, ActivityError> {
    match value {
        Some(value) if value > Decimal::ZERO => Ok(value),
        _ => Err(invalid(format!("{field} must be greater than zero"))),
    }
}

/// Whether both inputs name the same asset: by id when both carry one,
/// otherwise by symbol and exchange.
fn same_asset(a: &AssetResolutionInput, b: &AssetResolutionInput) -> Result<bool, ActivityError> {
    let key = |text: Option<&String>| {
        text.map(|value| value.trim().to_ascii_uppercase())
            .filter(|value| !value.is_empty())
    };
    let (a_id, b_id) = (key(a.id.as_ref()), key(b.id.as_ref()));
    if let (Some(a_id), Some(b_id)) = (&a_id, &b_id) {
        return Ok(a_id == b_id);
    }
    let (a_symbol, b_symbol) = (key(a.symbol.as_ref()), key(b.symbol.as_ref()));
    if (a_id.is_none() && a_symbol.is_none()) || (b_id.is_none() && b_symbol.is_none()) {
        return Err(invalid("Both swap assets are required"));
    }
    Ok(a_symbol.is_some()
        && a_symbol == b_symbol
        && key(a.exchange_mic.as_ref()) == key(b.exchange_mic.as_ref()))
}

fn invalid(message: impl Into<String>) -> ActivityError {
    ActivityError::InvalidData(message.into())
}

#[cfg(test)]
mod tests {
    use super::*;
    use rust_decimal_macros::dec;

    type RequestEdit = Box<dyn Fn(&mut SwapRequest)>;

    fn asset(symbol: &str) -> AssetResolutionInput {
        AssetResolutionInput {
            symbol: Some(symbol.to_string()),
            ..Default::default()
        }
    }

    /// 10 SOL, 0.01 of it as network fee, for 9.2 JitoSOL at 150 USD per SOL.
    fn sol_to_jitosol() -> SwapRequest {
        SwapRequest {
            source_group_id: None,
            account_id: "wallet".to_string(),
            activity_date: "2026-10-01".to_string(),
            currency: "USD".to_string(),
            from_asset: asset("SOL"),
            from_quantity: Some(dec!(10)),
            from_unit_price: Some(dec!(150)),
            fee_quantity: Some(dec!(0.01)),
            to_asset: asset("JITOSOL"),
            to_quantity: Some(dec!(9.2)),
            notes: None,
        }
    }

    #[test]
    fn legs_sell_the_given_asset_and_buy_the_received_one_for_the_same_cash() {
        let (sell, buy) = build_swap_legs(&sol_to_jitosol()).unwrap();

        assert_eq!(sell.activity_type, ACTIVITY_TYPE_SELL);
        assert_eq!(sell.get_symbol_code(), Some("SOL"));
        assert_eq!(sell.quantity, Some(dec!(10)));
        assert_eq!(sell.unit_price, Some(dec!(150)));
        assert_eq!(sell.fee, Some(dec!(1.50)));
        assert_eq!(sell.amount, Some(dec!(1498.50)));

        assert_eq!(buy.activity_type, ACTIVITY_TYPE_BUY);
        assert_eq!(buy.get_symbol_code(), Some("JITOSOL"));
        assert_eq!(buy.quantity, Some(dec!(9.2)));
        assert_eq!(buy.fee, Some(Decimal::ZERO));
        assert_eq!(buy.amount, Some(dec!(1498.50)));

        // The writer replaces a trade amount within half a cent by
        // quantity × price; the residue stays below display precision.
        let buy_cost = dec!(9.2) * buy.unit_price.unwrap();
        assert!((buy_cost - dec!(1498.50)).abs() < dec!(0.00000000000000000001));
    }

    #[test]
    fn legs_share_a_group_and_the_swap_subtype() {
        let (sell, buy) = build_swap_legs(&sol_to_jitosol()).unwrap();

        assert!(sell
            .source_group_id
            .as_deref()
            .is_some_and(|group| group.starts_with("wf-swap-")));
        assert_eq!(sell.source_group_id, buy.source_group_id);
        for leg in [&sell, &buy] {
            assert_eq!(leg.subtype.as_deref(), Some(ACTIVITY_SUBTYPE_SWAP));
            assert_eq!(leg.account_id, "wallet");
            assert_eq!(leg.currency, "USD");
        }
    }

    #[test]
    fn an_existing_group_is_kept() {
        let mut request = sol_to_jitosol();
        request.source_group_id = Some(" wf-swap-existing ".to_string());

        let (sell, buy) = build_swap_legs(&request).unwrap();

        assert_eq!(sell.source_group_id.as_deref(), Some("wf-swap-existing"));
        assert_eq!(buy.source_group_id.as_deref(), Some("wf-swap-existing"));
    }

    #[test]
    fn no_fee_sells_at_full_value() {
        let mut request = sol_to_jitosol();
        request.fee_quantity = None;

        let (sell, buy) = build_swap_legs(&request).unwrap();

        assert_eq!(sell.fee, Some(Decimal::ZERO));
        assert_eq!(sell.amount, Some(dec!(1500)));
        assert_eq!(buy.amount, Some(dec!(1500)));
    }

    #[test]
    fn invalid_requests_are_rejected() {
        let cases: Vec<(&str, RequestEdit)> = vec![
            (
                "zero given",
                Box::new(|r| r.from_quantity = Some(Decimal::ZERO)),
            ),
            ("missing given", Box::new(|r| r.from_quantity = None)),
            (
                "negative received",
                Box::new(|r| r.to_quantity = Some(dec!(-1))),
            ),
            (
                "zero price",
                Box::new(|r| r.from_unit_price = Some(Decimal::ZERO)),
            ),
            ("missing price", Box::new(|r| r.from_unit_price = None)),
            (
                "negative fee",
                Box::new(|r| r.fee_quantity = Some(dec!(-0.01))),
            ),
            (
                "fee equals given",
                Box::new(|r| r.fee_quantity = Some(dec!(10))),
            ),
            ("same symbol", Box::new(|r| r.to_asset = asset(" sol "))),
            (
                "missing asset",
                Box::new(|r| r.to_asset = AssetResolutionInput::default()),
            ),
            (
                "same id",
                Box::new(|r| {
                    r.from_asset.id = Some("asset-1".to_string());
                    r.to_asset.id = Some("ASSET-1".to_string());
                }),
            ),
        ];

        for (name, edit) in cases {
            let mut request = sol_to_jitosol();
            edit(&mut request);
            assert!(
                matches!(
                    build_swap_legs(&request),
                    Err(ActivityError::InvalidData(_))
                ),
                "{name} must be rejected"
            );
        }
    }

    #[test]
    fn same_symbol_on_another_exchange_is_a_different_asset() {
        let mut request = sol_to_jitosol();
        request.from_asset.exchange_mic = Some("XNAS".to_string());
        request.to_asset = AssetResolutionInput {
            symbol: Some("SOL".to_string()),
            exchange_mic: Some("XTSE".to_string()),
            ..Default::default()
        };

        assert!(build_swap_legs(&request).is_ok());
    }

    #[test]
    fn swap_subtype_is_canonicalized_on_trades() {
        for activity_type in [ACTIVITY_TYPE_BUY, ACTIVITY_TYPE_SELL] {
            assert_eq!(
                NewActivity::canonicalize_subtype_for_activity(activity_type, Some("swap"))
                    .as_deref(),
                Some(ACTIVITY_SUBTYPE_SWAP)
            );
        }
    }
}
