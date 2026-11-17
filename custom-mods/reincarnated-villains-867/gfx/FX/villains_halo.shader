Includes = {
	"pdxmesh_vfx.fxh"
	"cw/pdxmesh.fxh"
	"standardfuncsgfx.fxh"
	"cw/camera.fxh"
	"cw/pdxgui.fxh"
	"cw/utility.fxh"
}

PixelShader =
{
	TextureSampler DiffuseMap
	{
		Ref = PdxTexture0
		MagFilter = "Linear"
		MinFilter = "Linear"
		MipFilter = "Linear"
		SampleModeU = "Clamp"
		SampleModeV = "Clamp"
		srgb = yes
	}

	VertexStruct PS_COLOR_SSAO
	{
		float4 Color : PDX_COLOR0;
		float4 SSAOColor : PDX_COLOR1;
	};
}

PixelShader =
{
	MainCode PS_villains_head_halo
	{
		Input = "VS_OUTPUT_PDXMESH_VFX"
		Output = "PS_COLOR_SSAO"
		Code
		[[
			PDX_MAIN
			{
				PS_COLOR_SSAO Out;

				float2 SampledUV = ScaleUV( Input.UV0, 1.04f );
				float4 Diffuse = SampleClampedUV( DiffuseMap, SampledUV );
				Diffuse.a = ApplyOpacity( Diffuse.a, Input.Position.xy, Input.InstanceIndex );

				if ( Diffuse.a <= 0.003f )
				{
					discard;
				}

				float2 CenteredUV = SampledUV * 2.0f - 1.0f;
				float Angle = atan2( CenteredUV.y, CenteredUV.x );
				float HalfTime = GuiTime * 0.45f;

				float RayA = pow( abs( cos( Angle * 6.0f + HalfTime * 0.14f ) ), 3.0f );
				float RayB = pow( abs( cos( Angle * 12.0f - HalfTime * 0.09f ) ), 4.0f );
				float Breathe = 0.94f + 0.08f * sin( GuiTime * 1.8f );
				float Shimmer = 1.0f + ( RayA * 0.10f + RayB * 0.08f );

				float3 FinalColor = saturate( Diffuse.rgb * Breathe * Shimmer );
				float FinalAlpha = saturate( Diffuse.a * ( 0.96f + 0.04f * sin( GuiTime * 1.8f ) ) );

				Out.Color = float4( FinalColor, FinalAlpha );
				Out.SSAOColor = float4( 0.5f, 0.5f, 0.5f, FinalAlpha * 0.5f );
				return Out;
			}
		]]
	}
}

RasterizerState rasterizer_no_culling
{
	CullMode = "none"
}

BlendState halo_alpha_blend
{
	BlendEnable = yes
	SourceBlend = "SRC_ALPHA"
	DestBlend = "INV_SRC_ALPHA"
	SourceAlpha = "ONE"
	DestAlpha = "INV_SRC_ALPHA"
	WriteMask = "RED|GREEN|BLUE|ALPHA"
}

DepthStencilState depth_test_no_write
{
	DepthEnable = yes
	DepthWriteEnable = no
}

Effect mesh_vfx_head_halo
{
	VertexShader = "VS_mesh_vfx_standard"
	PixelShader = "PS_villains_head_halo"
	BlendState = "halo_alpha_blend"
	RasterizerState = "rasterizer_no_culling"
	DepthStencilState = "depth_test_no_write"
	Defines = { "BILLBOARD_HALO_MESH" "BILLBOARD_OFFSET_DISTANCE 30.0" }
}
