#![forbid(unsafe_code)]
#![allow(non_camel_case_types, non_snake_case)]
#![cfg_attr(feature = "wasm", allow(dead_code))]

use turbocharger::prelude::*;

mod app;

#[tokio::main(flavor = "multi_thread", worker_threads = 10)]
#[tracked]
async fn main() -> Result<(), tracked::StringError> {
	Ok(())
}
