use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod mozoflix_solana {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, fee_bps: u16) -> Result<()> {
        let global_state = &mut ctx.accounts.global_state;
        global_state.owner = ctx.accounts.owner.key();
        global_state.fee_bps = fee_bps;
        global_state.fees_collected = 0;
        global_state.total_videos = 0;
        Ok(())
    }

    pub fn register_video(
        ctx: Context<RegisterVideo>,
        content_hash: String,
        reward_per_view: u64,
        min_completion_pct: u8,
    ) -> Result<()> {
        require!(reward_per_view > 0, ErrorCode::InvalidReward);
        require!(min_completion_pct > 0 && min_completion_pct <= 100, ErrorCode::InvalidThreshold);

        let video = &mut ctx.accounts.video;
        let global_state = &mut ctx.accounts.global_state;

        video.creator = ctx.accounts.creator.key();
        video.content_hash = content_hash;
        video.reward_per_view = reward_per_view;
        video.min_completion_pct = min_completion_pct;
        video.active = true;
        video.id = global_state.total_videos + 1;
        
        video.pool_balance = 0;
        video.total_funded = 0;
        video.total_distributed = 0;
        video.claim_count = 0;

        global_state.total_videos += 1;

        Ok(())
    }

    pub fn fund_pool(ctx: Context<FundPool>, amount: u64) -> Result<()> {
        require!(amount > 0, ErrorCode::InvalidReward);

        let video = &mut ctx.accounts.video;
        
        let cpi_accounts = Transfer {
            from: ctx.accounts.funder_token_account.to_account_info(),
            to: ctx.accounts.pool_token_account.to_account_info(),
            authority: ctx.accounts.funder.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, amount)?;

        video.pool_balance += amount;
        video.total_funded += amount;

        Ok(())
    }

    pub fn distribute_reward(ctx: Context<DistributeReward>, completion_pct: u8) -> Result<()> {
        let video = &mut ctx.accounts.video;
        let global_state = &mut ctx.accounts.global_state;

        require!(video.active, ErrorCode::VideoInactive);
        require!(completion_pct >= video.min_completion_pct, ErrorCode::InvalidThreshold);
        require!(video.pool_balance >= video.reward_per_view, ErrorCode::InsufficientPool);

        let fee = (video.reward_per_view * (global_state.fee_bps as u64)) / 10_000;
        let payout = video.reward_per_view - fee;

        let seeds = &[
            b"video",
            video.id.to_le_bytes().as_ref(),
            &[ctx.bumps.video]
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.pool_token_account.to_account_info(),
            to: ctx.accounts.viewer_token_account.to_account_info(),
            authority: video.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, payout)?;

        if fee > 0 {
            let fee_cpi_accounts = Transfer {
                from: ctx.accounts.pool_token_account.to_account_info(),
                to: ctx.accounts.fee_token_account.to_account_info(),
                authority: video.to_account_info(),
            };
            let fee_cpi_program = ctx.accounts.token_program.to_account_info();
            let fee_cpi_ctx = CpiContext::new_with_signer(fee_cpi_program, fee_cpi_accounts, signer);
            token::transfer(fee_cpi_ctx, fee)?;
            global_state.fees_collected += fee;
        }

        video.pool_balance -= video.reward_per_view;
        video.total_distributed += video.reward_per_view;
        video.claim_count += 1;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = owner, space = 8 + 32 + 2 + 8 + 8, seeds = [b"global"], bump)]
    pub global_state: Account<'info, GlobalState>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct GlobalState {
    pub owner: Pubkey,
    pub fee_bps: u16,
    pub fees_collected: u64,
    pub total_videos: u64,
}

#[derive(Accounts)]
pub struct RegisterVideo<'info> {
    #[account(mut)]
    pub global_state: Account<'info, GlobalState>,
    #[account(
        init, 
        payer = creator, 
        space = 8 + 32 + 128 + 8 + 1 + 1 + 8 + 8 + 8 + 4 + 8, 
        seeds = [b"video", (global_state.total_videos + 1).to_le_bytes().as_ref()], 
        bump
    )]
    pub video: Account<'info, Video>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Video {
    pub creator: Pubkey,
    pub content_hash: String,
    pub reward_per_view: u64,
    pub min_completion_pct: u8,
    pub active: bool,
    pub pool_balance: u64,
    pub total_funded: u64,
    pub total_distributed: u64,
    pub claim_count: u32,
    pub id: u64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid reward amount")]
    InvalidReward,
    #[msg("Invalid threshold percentage")]
    InvalidThreshold,
    #[msg("Video is inactive")]
    VideoInactive,
    #[msg("Insufficient pool balance")]
    InsufficientPool,
}

#[derive(Accounts)]
pub struct FundPool<'info> {
    #[account(mut)]
    pub video: Account<'info, Video>,
    #[account(mut)]
    pub funder_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub pool_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub funder: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct DistributeReward<'info> {
    #[account(mut)]
    pub global_state: Account<'info, GlobalState>,
    #[account(mut)]
    pub video: Account<'info, Video>,
    #[account(mut)]
    pub pool_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub viewer_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub fee_token_account: Account<'info, TokenAccount>,
    pub owner: Signer<'info>,
    pub token_program: Program<'info, Token>,
}
